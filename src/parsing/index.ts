import { FundingRateHistoryItem } from "../fetching/hyperliquid-api/fundingHistory";

const MS_PER_MINUTE = 60 * 1000;

function removeDuplicateEntriesForHour(fundingHistory: FundingRateHistoryItem[]) {
  const cleanedFundingHistory = [];
  const cleanIfWithinXMinutes = 2

  for (let i = 0; i < fundingHistory.length; i++) {
    const currentEntry = fundingHistory[i];
    const nextEntry = fundingHistory[i + 1];

    if (
      nextEntry &&
      Math.abs(nextEntry.time - currentEntry.time) < cleanIfWithinXMinutes * MS_PER_MINUTE
    ) {
      // Skip the next entry if it's within 2 minutes of the current entry
      i++;
    } else {
      cleanedFundingHistory.push(currentEntry);
    }
  }

  return cleanedFundingHistory;
}

export function parseFundingHistory(fundingHistory: FundingRateHistoryItem[]) {
  return removeDuplicateEntriesForHour(fundingHistory);
}
