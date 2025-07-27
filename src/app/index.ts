import { JobExecutor } from "../JobExecutor";
import { InsightService } from "../InsightService";
import { IRepository, Job } from "../JobRepository";

export class App {
  constructor(
    private jobExecutor: JobExecutor,
    private insightsService: InsightService,
    private jobRepository: IRepository<Job>
  ) {}

  async registerJob(name: string, args: string[] = []): Promise<Job> {
    return this.jobExecutor.enqueueJob({ name, arguments: args });
  }

  async getJobs() {
    return this.jobRepository.get();
  }

  async getStats() {
    return this.insightsService.getInsights();
  }
}
