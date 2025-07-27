import { IRepository, Job } from "./JobRepository";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import util from "util";
import { once } from "events";
import path from "path";

export class JobExecutor {
  private queue: Job[] = [];
  private runningCount = 0;
  constructor(
    private jobRepository: IRepository<Job>,
    private options: { concurrency: number; retryLimit: number }
  ) {}

  public async enqueueJob(params: {
    name: string;
    arguments: string[];
    retryCount?: number;
    parentId?: string;
  }) {
    const job: Job = {
      id: randomUUID(),
      status: "queued",
      queueTime: Date.now(),
      retryCount: 0,
      stdoutBytes: 0,
      stderrBytes: 0,
      usage: [],
      ...params,
    };

    await this.jobRepository.upsert(job);
    this.queue.push(job);
    this.processQueue();
    return job;
  }

  private async collectPidStats(pid: number) {
    return {
      mem: Math.random() * 1000,
      cpu: Math.random(),
    };
  }

  private async runJob(job: Job) {
    let intervalRef: NodeJS.Timeout | undefined;
    try {
      const scriptName =
        process.platform === "win32" ? "win-script.bat" : "bash-script.sh";
      const scriptPath = path.resolve(process.cwd(), "scripts", scriptName);
      const proc = spawn(scriptPath, job.arguments, {
        shell: true,
        stdio: "pipe",
      });
      job.status = "running";
      await this.jobRepository.upsert(job);

      proc.stdout.on("data", (chunk) => {
        job.stdoutBytes = (job.stdoutBytes || 0) + chunk.byteLength;
      });
      proc.stderr.on("data", (chunk) => {
        job.stderrBytes = (job.stderrBytes || 0) + chunk.byteLength;
      });
      proc.once("spawn", () => {
        job.startTime = Date.now();
        intervalRef = setInterval(() => {
          this.collectPidStats(proc.pid!).then((stats) => {
            job.usage.push({ ts: Date.now(), ...stats });
          });
        }, 100);
      });
      proc.once("error", (err) => {
        job.error = util.inspect(err);
      });
      proc.once("close", (code, signal) => {
        job.endTime = Date.now();
        if (code !== null) job.exitCode = code;
        if (signal !== null) job.signal = signal;
      });
      await once(proc, "close");
    } catch (err) {
      job.error = util.inspect(err);
    } finally {
      clearInterval(intervalRef);
      job.status = job.error || job.exitCode !== 0 ? "crashed" : "completed";
      await this.jobRepository.upsert(job);
      return job;
    }
  }

  private processQueue() {
    while (
      this.runningCount < this.options.concurrency &&
      this.queue.length > 0
    ) {
      const job = this.queue.shift();
      if (!job) break;
      this.runningCount++;
      this.runJob(job)
        .then((job) => {
          if (job.exitCode !== 0 && job.retryCount < this.options.retryLimit) {
            this.enqueueJob({
              name: job.name,
              arguments: job.arguments,
              parentId: job.id,
              retryCount: job.retryCount + 1,
            });
          }
        })
        .finally(() => {
          this.runningCount--;
          setImmediate(() => this.processQueue());
        });
    }
  }
}
