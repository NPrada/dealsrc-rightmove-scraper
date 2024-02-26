import { createHash } from "crypto";
import stringify from "json-stable-stringify";

export const objectToHashStable = (obj: object): string => {
  // Convert the object to a JSON string with guaranteed consistent ordering
  const jsonString = stringify(obj);

  // Create a hash from the JSON string
  const hash = createHash("sha256").update(jsonString).digest("hex");

  return hash;
};
