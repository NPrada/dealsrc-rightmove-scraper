import type { Params as ChronParams } from "fastify-cron";
import { logger } from "..";
import { loadData } from "../..";
import { findLocationByPostcode, scrapeSearch } from "../../fetching/rightmove";
import { postcodeAreas } from "../../../postcodes/postcodes";
import { deduplicateListings, parseRightMoveListing } from "../../parsing";
import { upsertPropertyListings } from "../../persistance/fly-pg";
import { sleep } from "../../utils/sleep";
import { Loader } from "../../loader";
import { propertyListingEntity } from "../../loader/entities";
import { PGTarget } from "../../loader/targets/pg-target";
import { env } from "../../env";
import { retry } from "../../utils/retry";

let isRunning = false;
export const cronLoadPropertyData: ChronParams = {
  name: "run-load-data",
  start: true,
  runOnInit: true,
  cronTime: "12 22 * * *", // every 19 min
  onTick: async () => {
    if (!isRunning) {
      try {
        isRunning = true;
        logger.info("booted the load data cron process...");

        const target = new PGTarget(propertyListingEntity, {
          connectionString: env.DATABASE_URL,
          max: 20,
        });

        const propertyLoader = new Loader({
          entity: propertyListingEntity,
          target: target,
        });
        for (const [index, postcode] of postcodeAreas.entries()) {
          await sleep(1000);
          try {
            await retry(
              async () => {
                const mostLikelyRegion = await findLocationByPostcode(postcode);
                const searchResults = await scrapeSearch(
                  mostLikelyRegion,
                  "BUY"
                );

                const parsedResults = searchResults.map((result) =>
                  parseRightMoveListing(result, postcode)
                );

                await propertyLoader.process({
                  newData: parsedResults,
                  postcode: postcode,
                });
                console.log(
                  `⤴️ scraped and upserted ${postcode} listings ${
                    index + 1
                  } of ${postcodeAreas.length}...`
                );
              },
              3,
              1000
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

// try {
//   isRunning = true;
//   logger.info("booted the load data cron process...");

//   for (const [index, postcode] of postcodeAreas.entries()) {
//     try {
//       await retry(
//         async () => {
//           const mostLikelyRegion = await findLocationByPostcode(postcode);
//           const searchResults = await scrapeSearch(
//             mostLikelyRegion,
//             "BUY"
//           );
//           const parsedResults = searchResults.map((result) =>
//             parseRightMoveListing(result, postcode)
//           );

//           await upsertPropertyListings(
//             deduplicateListings(parsedResults),
//             "BUY"
//           );
//           console.log(
//             `⤴️ scraped and upserted ${postcode} listings ${
//               index + 1
//             } of ${postcodeAreas.length}...`
//           );
//           await sleep(1000);
//         },
//         3,
//         1000 * 10
//       );
//     } catch (error) {
//       logger.error(error, `Error during ${postcode} scrape`);
//     }
//   }

//   logger.info("finished loading data");
// } catch (error) {
//   // handle any error that occurred during execution
//   logger.error(error, "Error during fetch");
//   // break; // break the loop if an error occurred
// } finally {
//   isRunning = false;
// }
