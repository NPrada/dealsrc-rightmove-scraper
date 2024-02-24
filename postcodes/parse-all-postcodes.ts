import { JSDOM } from "jsdom";
import { htmlString } from "./raw-html-table";
import { writeFile } from "fs";

// const extractSecondColumnText = (html: string) => {
//   const { window } = new JSDOM(html);
//   const { document } = window;
//   const rows = Array.from(document.querySelectorAll("tr"));
//   const secondColumnTexts = rows.map((row) => {
//     const cells = Array.from(row.querySelectorAll("td"));
//     return cells[1] ? cells[1].textContent : "";
//   });
//   return secondColumnTexts.filter((text) => text !== ""); // Filter out any rows that might not have a second cell
// };

const extractSecondColumnText = (html: string): string[] => {
  const { window } = new JSDOM(html);
  const { document } = window;
  const rows = Array.from(document.querySelectorAll("tr"));
  const secondColumnTexts: string[] = rows.map((row) => {
    const cells = Array.from(row.querySelectorAll("td"));
    if (!cells[1]) return "";
    return Array.from(cells[1].childNodes)
      .filter((node) => node.nodeType === 3) // Node.TEXT_NODE
      .map((node) => node.nodeValue?.trim() ?? "")
      .join("");
  });
  return secondColumnTexts.filter((text) => text !== ""); // Filter out any rows that might not have a second cell or text content
};

/*
takes strings that look like this:
  'BH23',
  'BH24',
  'BH25',
  'BH31',
  'BL0, BL8, BL9',
  'BL1, BL2, BL3, BL4, BL5, BL6, BL7,BL11,BL78',
  'BN1, BN2,BN41, BN42, BN45,BN50,BN51,BN88',
  'BN3,BN52',
*/

const parsePostcodes = (rawStrings: string[]) => {
  const allPostcodes = new Set<string>();

  rawStrings.forEach((rawString) => {
    const postcodes = rawString.split(",").map((postcode) => postcode.trim());
    postcodes.forEach((postcode) => allPostcodes.add(postcode));
  });

  return Array.from(allPostcodes);
};

const writeArrayToFile = (array: string[]) => {
  writeFile("./postcodes/postcodes.ts", "export const postcodeAreas = " + JSON.stringify(array), (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log("File has been created");
  });
};

const secondColumnTexts = extractSecondColumnText(htmlString);
console.log(writeArrayToFile(parsePostcodes(secondColumnTexts)));
