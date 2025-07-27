import { FromSchema } from "json-schema-to-ts";
import { FastifyInstance } from "fastify";
import { App } from "../app";

const bodySchema = {
  type: "object",
  properties: {
    jobName: { type: "string" },
    arguments: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: ["jobName", "arguments"],
} as const;

export default function registerJobsRoutes(server: FastifyInstance, app: App) {
  server.post<{ Body: FromSchema<typeof bodySchema> }>(
    "/jobs",
    {
      schema: { body: bodySchema },
    },
    async (req, res) => {
      const job = await app.registerJob(req.body.jobName, req.body.arguments);
      res.status(201);
      return {
        id: job.id,
        name: job.name,
      };
    }
  );
}
