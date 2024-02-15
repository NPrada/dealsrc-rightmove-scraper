import axios from "axios";
import { logger } from "../server";

interface TypeAheadLocation {
  locationIdentifier: string;
}

interface SearchResult {
  resultCount: string;
  properties: any[]; // Define more specifically based on actual data structure
}

export async function findLocations(query: string): Promise<string[]> {
  logger.info(`Searching for locations matching query: ${query}`);
  const splitStringEveryTwoChars = (str: string) => str.match(/.{1,2}/g) || [];

  const tokenizeQuery = splitStringEveryTwoChars(query.toUpperCase()).join("/");

  // .toUpperCase()
  // .split("")
  // .reduce((acc, char, i) => acc + (i % 2 === 0 ? char + "/" : char), "");
  // const url = `https://www.rightmove.co.uk/typeAhead/uknostreet/CO/RN/WA/LL/`
  const url = `https://www.rightmove.co.uk/typeAhead/uknostreet/${tokenizeQuery}/`;

  console.log("url: ", url);
  const response = await axios.get(url);
  const data = response.data;
  console.log(data);
  return data.typeAheadLocations.map(
    (prediction: TypeAheadLocation) => prediction.locationIdentifier
  );
}

export async function scrapeSearch(locationId: string): Promise<any[]> {
  const RESULTS_PER_PAGE = 24;

  const makeUrl = (offset: number): string => {
    const params = new URLSearchParams({
      areaSizeUnit: "sqft",
      channel: "BUY",
      currencyCode: "GBP",
      includeSSTC: "false",
      index: offset.toString(),
      isFetching: "false",
      locationIdentifier: locationId,
      numberOfPropertiesPerPage: RESULTS_PER_PAGE.toString(),
      radius: "0.0",
      sortType: "6",
      viewType: "LIST",
    });
    return `https://www.rightmove.co.uk/api/_search?${params.toString()}`;
  };

  const firstPage = await axios.get<SearchResult>(makeUrl(0));
  const firstPageData = firstPage.data;
  const totalResults = parseInt(firstPageData.resultCount.replace(",", ""), 10);
  let results = firstPageData.properties;

  const maxApiResults = 1000;
  const otherPagesPromises = [];
  for (
    let offset = RESULTS_PER_PAGE;
    offset < totalResults && offset < maxApiResults;
    offset += RESULTS_PER_PAGE
  ) {
    otherPagesPromises.push(axios.get<SearchResult>(makeUrl(offset)));
  }

  const otherPages = await Promise.all(otherPagesPromises);
  otherPages.forEach((response) => {
    results = results.concat(response.data.properties);
  });

  return results;
}
