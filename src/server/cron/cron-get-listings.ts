import type { Params as ChronParams } from "fastify-cron";
import { logger } from "..";
import { loadData } from "../..";
import { findLocations, scrapeSearch } from "../../fetching/rightmove";

export const cronLoadData: ChronParams = {
  name: "run-load-data",
  start: true,
  runOnInit: true,
  cronTime: "0,1,5,55,59 * * * *", // every 19 min
  onTick: async () => {
    try {
      logger.info("booted the load data cron process...");

      const cornwallId = (await findLocations('cornwall'))[0];
      console.log(cornwallId);
      // const cornwallResults = await scrapeSearch(cornwallId);
      // console.log(JSON.stringify(cornwallResults, null, 2));

      logger.info("finished loading data")
    } catch (error) {
      // handle any error that occurred during execution
      logger.error(error, "Error during fetch");
      // break; // break the loop if an error occurred
    }
  },
};
