import { IRepository, Job } from "./JobRepository";

type Predicate = (job: Job, overalStats: Stats, jobs: Job[]) => Boolean;
type Stats = {
  totalJobs: number;
  crashedJobs: number;
  completedJobs: number;
  completeRate: number;
  executionTimePercentile99: number;
  executionTimePercentile95: number;
  executionTimePercentile90: number;
  executionTimePercentile75: number;
  executionTimeMedian: number;

  avgMemUsage: number;
  avgCPUUsage: number;
};

export class InsightService {
  private patterns = new Map<string, Predicate>();
  constructor(private jobRepository: IRepository<Job>) {
    this.definePattern("has arg --debug", (job) =>
      job.arguments.includes("--debug")
    );
    this.definePattern("it is a retry job", (job) => job.retryCount > 0);
    this.definePattern(
      "execution time is median or lower",
      (job, overalStats) => {
        const executionTime =
          job.endTime && job.startTime ? job.endTime - job.startTime : 0;
        return executionTime <= overalStats.executionTimeMedian;
      }
    );
    this.definePattern(
      "execution time 2 or more stdev from mean",
      (job, overalStats, jobs) => {
        if (!job.startTime || !job.endTime) return false;
        const executionTimes = jobs
          .filter((job) => job.startTime && job.endTime)
          .map((job) => job.endTime! - job.startTime!);
        const zscore = this.zscore(executionTimes, job.endTime - job.startTime);
        return Math.abs(zscore) > 2;
      }
    );
    this.definePattern("has stderr output", (job) => job.stdoutBytes > 0);
    this.definePattern("avg Mem usage is more than 512MB", (job) => {
      return this.avg(job.usage.map(({ mem }) => mem)) > 512;
    });
    this.definePattern("avg CPU usage is more than 0.5", (job) => {
      return this.avg(job.usage.map(({ cpu }) => cpu)) > 0.5;
    });
  }

  private definePattern(name: string, predicate: Predicate) {
    this.patterns.set(name, predicate);
  }

  public async getInsights() {
    const jobs = await this.jobRepository.get();
    const overalStats = this.evaluateStats(jobs);
    const patternsStats = this.evaluatePatterns(jobs, overalStats);
    return {
      ...overalStats,
      patterns: patternsStats,
    };
  }

  private evaluatePatterns(jobs: Job[], overalStats: Stats) {
    return [...this.patterns.entries()].map(([name, predicate]) => {
      const subset = jobs.filter((job) => predicate(job, overalStats, jobs));
      const patternStats = this.evaluateStats(subset);
      return {
        name,
        ...patternStats,
        diff: this.statsDiff(overalStats, patternStats),
      };
    });
  }

  private evaluateStats(jobs: Job[]): Stats {
    const crashedJobs = jobs.filter((job) => job.status === "crashed");
    const completedJobs = jobs.filter((job) => job.status === "completed");
    const executionTimes = jobs
      .filter((job) => job.startTime && job.endTime)
      .map((job) => job.endTime! - job.startTime!)
      .sort((a, b) => a - b);

    const jobsAvgMemUsage = jobs
      .filter((job) => job.usage.length > 0)
      .map((job) => this.avg(job.usage.map(({ mem }) => mem)));

    const jobsAvgCPUUsage = jobs
      .filter((job) => job.usage.length > 0)
      .map((job) => this.avg(job.usage.map(({ cpu }) => cpu)));

    return {
      totalJobs: jobs.length,
      crashedJobs: crashedJobs.length,
      completedJobs: completedJobs.length,
      completeRate: jobs.length !== 0 ? completedJobs.length / jobs.length : 0,
      executionTimePercentile99: this.percentile(executionTimes, 99),
      executionTimePercentile95: this.percentile(executionTimes, 95),
      executionTimePercentile90: this.percentile(executionTimes, 90),
      executionTimePercentile75: this.percentile(executionTimes, 75),
      executionTimeMedian: this.percentile(executionTimes, 50),
      avgCPUUsage: this.avg(jobsAvgCPUUsage),
      avgMemUsage: this.avg(jobsAvgMemUsage),
    };
  }

  private statsDiff(baseStats: Stats, newStats: Stats) {
    return Object.fromEntries(
      Object.entries(baseStats).map(([key, value]) => {
        const newValue = newStats[key as keyof typeof newStats];
        const diffPercent =
          value !== 0 ? ((newValue - value) / value) * 100 : 0;
        const sign = diffPercent >= 0 ? "+" : "-";
        return [key, `${sign}${Math.abs(diffPercent).toFixed(2)}%`];
      })
    );
  }

  private percentile(arr: number[], p: number) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (arr.length - 1);

    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) return sorted[lower];

    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private avg(arr: number[]) {
    if (arr.length === 0) return 0;
    return arr.reduce((l, r) => l + r, 0) / arr.length;
  }

  private stdev(arr: number[]) {
    if (arr.length <= 1) return 0;
    const avg = this.avg(arr);
    return (
      arr.reduce((sum, n) => sum + Math.pow(n - avg, 2), 0) / arr.length - 1
    );
  }

  private zscore(dataset: number[], value: number) {
    const avg = this.avg(dataset);
    const stdev = this.stdev(dataset);
    return (value - avg) / stdev;
  }
}
