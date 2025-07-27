type Status = "queued" | "running" | "completed" | "crashed";

export type Job = {
  id: string;
  parentId?: string;
  name: string;
  arguments: string[];
  status: Status;
  retryCount: number;
  stdoutBytes: number;
  stderrBytes: number;
  usage: { ts: number; mem: number; cpu: number }[];
  queueTime?: number;
  startTime?: number;
  endTime?: number;
  exitCode?: number;
  signal?: string;
  error?: string;
};

export class JobInMemoryRepository implements IRepository<Job> {
  private jobs = new Map<string, Job>();
  async upsert(job: Job) {
    this.jobs.set(job.id, { ...job });
  }
  async get() {
    return [...this.jobs.values()];
  }
}

export interface IRepository<T = any> {
  upsert(entity: T): Promise<void>;
  get(): Promise<T[]>;
}
