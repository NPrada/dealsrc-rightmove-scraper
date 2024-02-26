// @ts-nocheck
import axios from "axios";
import { logger } from "../server";
import { PropertyListing } from "../type";
import cheerio from "cheerio";

type TypeAheadLocation = {
  displayName: string;
  locationIdentifier: string;
  normalisedSearchTerm: string;
};

type SearchLoactionResponse = {
  key: string;
  term: string;
  typeAheadLocations: TypeAheadLocation[];
  isComplete: boolean;
};

interface SearchResult {
  resultCount: string;
  properties: any[]; // Define more specifically based on actual data structure
}

// Add postcode here:
const url = "https://www.rightmove.co.uk/house-prices/sy3.html";

export const findLocationByPostcode = async (
  postcode: string
): Promise<string> => {
  try {
    const response = await fetch(
      `https://www.rightmove.co.uk/house-prices/${postcode}.html`
    );

    const htmlText = await response.text();
    const $ = cheerio.load(htmlText);
    //@ts-ignore
    const scriptContent = $("script:not([src])")
      .toArray()
      .find((script: any) => $(script).html()?.includes("__PRELOADED_STATE__"))
      ?.children[0].data; //@ts-ignore

    if (!scriptContent) throw new Error("Data not found");

    const matched = scriptContent.replace("window.__PRELOADED_STATE__ =", "");

    if (!matched || matched.length < 2) throw new Error("Data parsing error");

    const data = JSON.parse(matched);

    const locationId = data.searchLocation.locationId;

    return `OUTCODE^${locationId}`;
  } catch (error) {
    console.error("Error fetching or parsing data:", error);
    throw error;
  }
};

export async function scrapeSearch(
  locationId: string,
  listingType: "BUY" | "RENT" = "BUY"
): Promise<PropertyListing[]> {
  const RESULTS_PER_PAGE = 24;

  const makeUrl = (offset: number): string => {
    const params = new URLSearchParams({
      areaSizeUnit: "sqft",
      channel: listingType,
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
  let results: PropertyListing[] = firstPageData.properties;

  const maxApiResults = 1000;
  const otherPagesPromises: any[] = [];
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

export async function findLocationsByName(query: string): Promise<string[]> {
  const splitStringEveryTwoChars = (str: string) => str.match(/.{1,2}/g) || [];

  const tokenizeQuery = splitStringEveryTwoChars(query.toUpperCase()).join("/");
  // .toUpperCase()
  // .split("")
  // .reduce((acc, char, i) => acc + (i % 2 === 0 ? char + "/" : char), "");
  // const url = `https://www.rightmove.co.uk/typeAhead/uknostreet/CO/RN/WA/LL/`
  const url = `https://www.rightmove.co.uk/typeAhead/uknostreet/${tokenizeQuery}/`;

  const response = await axios.get<SearchLoactionResponse>(url);
  const data = response.data;
  console.log(data);
  return data.typeAheadLocations.map(
    (prediction: TypeAheadLocation) => prediction.locationIdentifier
  );
}
