import { FastifyInstance } from "fastify";
import { App } from "../app";

export default function registerJobsRoutes(server: FastifyInstance, app: App) {
  server.get("/jobs", {}, async () => {
    const jobs = await app.getJobs();
    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      retryCount: job.retryCount,
      parentId: job.parentId,
    }));
  });
}
