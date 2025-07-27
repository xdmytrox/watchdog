import Fastify, { FastifyInstance } from "fastify";
export function createServer(): FastifyInstance {
  const server = Fastify({});
  return server;
}
