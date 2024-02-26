import { logger, server } from "./src/server";
import fastifyCron from "fastify-cron";
import { cronLoadPropertyData } from "./src/server/cron/cron-get-property-listings";
import { cronLoadRentalListingsData } from "./src/server/cron/cron-get-rental-listings";

server.register(fastifyCron, {
  jobs: [
    cronLoadPropertyData,
    // cronLoadRentalListingsData,
  ],
});

server.get("/health", (request, reply) => {
  reply.send("OK");
});

server.get("/", (request, reply) => {
  reply.send("OK");
});

const start = async () => {
  try {
    const port = 8080;
    server.listen({ port }, () => {
      logger.info(`Server running on port ${port}`);
      if (server.cron) {
        server.cron.startAllJobs();
      }
    });
  } catch (err) {
    logger.error("Errored while listening");
    logger.error(err);
    process.exit(1);
  }
};

start();

process.on("uncaughtException", async (err) => {
  logger.fatal("uncaughtException");
  // windowManager.killWindows();
  logger.error(err);
  // await ChromeLauncher.killAll();
  // process.exit(1);
});

process.on("unhandledRejection", async (err) => {
  logger.fatal("unhandledRejection");
  // windowManager.killWindows();
  logger.error(err);
  // await ChromeLauncher.killAll();
  // process.exit(1);
});
