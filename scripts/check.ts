import { createApp } from "../src/app/compositionRoot";
import { setTimeout } from "timers/promises";
const app = createApp();

(async () => {
  await app.registerJob("job-#1", ["arg1", "arg2"]);
  await app.registerJob("job-#2", ["arg1", "arg2"]);
  await app.registerJob("job-#3", ["arg1", "arg2"]);
  await app.registerJob("job-#4", ["arg1", "arg2"]);
  await app.registerJob("job-#5", ["arg1", "arg2"]);
  await app.registerJob("job", ["--debug", "arg2"]);
  await app.registerJob("job", ["--debug", "arg2"]);
  await app.registerJob("job", ["--debug", "arg2"]);
  await app.registerJob("job", ["--debug", "arg2", "asd", "ds"]);
  await app.registerJob("job", ["--debug", "arg2", "asd", "ds"]);
  await app.registerJob("job", ["--debug", "arg2", "asd", "ds"]);
  await setTimeout(10000);
  console.log(JSON.stringify(await app.getJobs(), null, 2));
  console.log(JSON.stringify(await app.getStats(), null, 2));
})();
