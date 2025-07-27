import { createServer } from "./src/server";
import { createApp } from "./src/app/compositionRoot";
import registerPostJobs from "./src/routes/postJobs";
import registerGetJobs from "./src/routes/getJobs";
import registerGetStats from "./src/routes/getStats";

const server = createServer();
const app = createApp();

registerPostJobs(server, app);
registerGetJobs(server, app);
registerGetStats(server, app);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
server.listen({ port });
