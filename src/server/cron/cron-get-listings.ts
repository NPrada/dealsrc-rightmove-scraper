import type { Params as ChronParams } from "fastify-cron";
import { logger } from "..";
import { loadData } from "../..";
import { findLocationByPostcode, scrapeSearch } from "../../fetching/rightmove";
import { postcodeAreas } from "../../../postcodes/postcodes";
import { deduplicateListings, parseRightMoveListing } from "../../parsing";
import { upsertPropertyListings } from "../../persistance/fly-pg";
import { sleep } from "../../utils/sleep";
let isRunning = false;
export const cronLoadData: ChronParams = {
  name: "run-load-data",
  start: true,
  runOnInit: true,
  cronTime: "0,1,5,55,59 * * * *", // every 19 min
  onTick: async () => {
    if (!isRunning) {
      try {
        isRunning = true;
        logger.info("booted the load data cron process...");

        for (const [index, postcode] of postcodeAreas.entries()) {
          const mostLikelyRegion = await findLocationByPostcode(postcode);
          const searchResults = await scrapeSearch(mostLikelyRegion);
          console.log("searchResults", searchResults[0])
          const parsedResults = searchResults.map((result) =>
            parseRightMoveListing(result, postcode)
          );

          await upsertPropertyListings(deduplicateListings(parsedResults));
          console.log(
            `⤴️ scraped and upserted ${postcode} listings ${index + 1} of ${
              postcodeAreas.length
            }...`
          );
          await sleep(5000);
        }

        logger.info("finished loading data");
      } catch (error) {
        // handle any error that occurred during execution
        logger.error(error, "Error during fetch");
        // break; // break the loop if an error occurred
      } finally {
        isRunning = false;
      }
    }
  },
};
