import { Pool } from "pg";
import { retry } from "../utils/retry";
import { FundingRateHistoryItem } from "../fetching/hyperliquid-api/fundingHistory";
import { env } from "../env";

const pool = new Pool({
  connectionString: env.DATABASE_URL_PG,
});

export async function persistToPostgres(data: FundingRateHistoryItem[]) {
  try {
    const queryText = `
      INSERT INTO hyperliquid_funding(
        coin, fundingRate, premium, time
      ) VALUES ${data
        .map(
          (_, idx) =>
            `($${4 * idx + 1}, $${4 * idx + 2}, $${4 * idx + 3}, $${
              4 * idx + 4
            })`
        )
        .join(", ")}
      ON CONFLICT (coin, time) 
      DO UPDATE SET
        fundingRate = excluded.fundingRate,
        premium = excluded.premium
    `;

    const values = data.flatMap((row) => [
      row.coin,
      row.fundingRate,
      row.premium,
      formatDateForPostgres(new Date(row.time)),
    ]);

    await retry(async () => {
      await pool.query(queryText, values);
    });
  } catch (error) {
    console.error("Error persisting data to PostgreSQL:", error);
  }
}

function formatDateForPostgres(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}



export async function getLatestTimesForAllSymbols(symbols: string[]): Promise<Map<string, Date>> {
  const queryText = `
    SELECT coin, MAX(time) as latest_time FROM hyperliquid_funding
    WHERE coin = ANY($1)
    GROUP BY coin
  `;
  const res = await pool.query(queryText, [symbols]);
  const latestTimesMap = new Map<string, Date>();
  
  for (const row of res.rows) {
    latestTimesMap.set(row.coin, new Date(row.latest_time));
  }
  return latestTimesMap;
}
