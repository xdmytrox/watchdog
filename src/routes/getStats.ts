import { FastifyInstance } from "fastify";
import { App } from "../app";

export default function registerJobsRoutes(server: FastifyInstance, app: App) {
  server.get("/stats", {}, async () => {
    return app.getStats();
  });
}
