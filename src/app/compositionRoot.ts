import { JobInMemoryRepository } from "../JobRepository";
import { JobExecutor } from "../JobExecutor";
import { InsightService } from "../InsightService";
import { App } from ".";

export function createApp(): App {
  const jobRepository = new JobInMemoryRepository();
  const jobExecutor = new JobExecutor(jobRepository, {
    concurrency: 50,
    retryLimit: 2,
  });
  const insightsService = new InsightService(jobRepository);

  return new App(jobExecutor, insightsService, jobRepository);
}
