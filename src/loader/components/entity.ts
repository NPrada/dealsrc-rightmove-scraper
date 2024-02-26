import { State } from "./event-log";

export interface Entity {
  name: string;
  keyFields: string[];
}

export abstract class AbstractEntity implements Entity {
  abstract name: string;
  abstract keyFields: string[];
  fields: readonly string[] = [];

  data_to_tuple(data: Record<string, any> | undefined): any[] {
    try {
      const tupleData = [];

      for (const field of this.fields) {
        tupleData.push(data?.[field] || null); // Using null as per your preference
      }

      return tupleData;
    } catch (error) {
      if (error instanceof Error) {
        const modifiedErrorMessage = `${error.message} | data: ${JSON.stringify(
          data
        )}`;
        const newError = new Error(modifiedErrorMessage);
        if (error.stack) {
          newError.stack = error.stack;
        }
        throw newError;
      } else {
        throw error;
      }
    }
  }
}

export type Key = Entity["keyFields"];
