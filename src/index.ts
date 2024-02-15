import { fetchFundingHistory } from "./fetching/hyperliquid-api/fundingHistory";
import { fetchExchangeInfo } from "./fetching/hyperliquid-api/exchangeInfo";
import {
  getLatestTimesForAllSymbols,
  persistToPostgres,
} from "./persistance/fly-pg";
import { parseFundingHistory } from "./parsing";
import { logger } from "./server";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const chunkSizeInDays = 21;
const dataStartingPoint = new Date("2023-01-01");

export async function loadData() {
  const exchangeInfo = await fetchExchangeInfo();
  const symbols = [...exchangeInfo.universe].map((el) => el.name);
  logger.info(`Starting scraping, ${symbols.length} symbols found`);

  const latestTimesMap = await getLatestTimesForAllSymbols(symbols);

  const startDate = dataStartingPoint;
  const endDate = new Date();

  const totalSymbols = symbols.length;
  let symbolsProcessed = 0;

  for (const symbol of symbols) {
    const latestTime = latestTimesMap.get(symbol);
    let currentDate = latestTime
      ? new Date(latestTime.getTime() - 60 * 1000) // subtract one minute
      : new Date(startDate);

    let ratesFound = 0;
    while (currentDate <= endDate) {
      ratesFound = 0;
      const nextDate = new Date(
        currentDate.getTime() + chunkSizeInDays * MS_PER_DAY
      );

      const fundingHistory = await fetchFundingHistory(
        symbol,
        currentDate,
        nextDate
      );

      const cleanFundingHistory = parseFundingHistory(fundingHistory);

      if (fundingHistory.length > 0) {
        await persistToPostgres(cleanFundingHistory);
      }

      currentDate = nextDate;
      ratesFound = fundingHistory.length;
    }

    symbolsProcessed++;

    logger.info(
      `Processed ${symbol} chunk ${symbolsProcessed} of ${totalSymbols}, (${ratesFound} rates found)`
    );
  }
}
