import type { Params as ChronParams } from "fastify-cron";
import { logger } from "..";
import { findLocationByPostcode, scrapeSearch } from "../../fetching/rightmove";
import { postcodeAreas } from "../../../postcodes/postcodes";
import { deduplicateListings, parseRightMoveListing } from "../../parsing";
import { upsertPropertyListings } from "../../persistance/fly-pg";
import { sleep } from "../../utils/sleep";
import { retry } from "../../utils/retry";

let isRunning = false;
export const cronLoadRentalListingsData: ChronParams = {
  name: "run-load-data",
  start: true,
  runOnInit: true,
  cronTime: "12 14 * * *", // every 19 min
  onTick: async () => {
    if (!isRunning) {
      try {
        isRunning = true;
        logger.info("booted the load data cron process...");

        for (const [index, postcode] of postcodeAreas.entries()) {
          try {
            await retry(
              async () => {
                const mostLikelyRegion = await findLocationByPostcode(postcode);
                const searchResults = await scrapeSearch(
                  mostLikelyRegion,
                  "RENT"
                );
                const parsedResults = searchResults.map((result) =>
                  parseRightMoveListing(result, postcode)
                );

                await upsertPropertyListings(
                  deduplicateListings(parsedResults),
                  "RENT"
                );
                console.log(
                  `⤴️ scraped and upserted ${postcode} listings ${
                    index + 1
                  } of ${postcodeAreas.length}...`
                );
                await sleep(1000);
              },
              3,
              1000 * 10
            );
          } catch (error) {
            logger.error(error, `Error during ${postcode} scrape`);
          }
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
