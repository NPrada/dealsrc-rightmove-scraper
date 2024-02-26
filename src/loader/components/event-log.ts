// Assuming EventType, State, and other necessary types are defined elsewhere
import { objectToHashStable } from "../utils/stable-hash";
import { AbstractEntity } from "./entity";
import { EventType } from "./types";

// TypeScript doesn't have a direct equivalent to Python's ABC (Abstract Base Class),
// but we can use abstract classes and methods to achieve a similar effect.

export type KeyVal = string;

export class State {
  event_id?: number;
  delivery_id?: number;
  data?: any;
  keyVal?: KeyVal;
  entity: AbstractEntity;

  constructor({
    event_id,
    delivery_id,
    data,
    keyVal,
    entity,
  }: {
    event_id?: number;
    delivery_id?: number;
    data?: any;
    keyVal?: string;
    entity: AbstractEntity;
  }) {
    this.event_id = event_id;
    this.delivery_id = delivery_id;
    this.data = data;
    this.keyVal = keyVal;
    this.entity = entity;
  }

  get hash(): string {
    if (this.data === undefined) return "";
    return objectToHashStable(this.data);
  }

  get key(): KeyVal {
    if (this.keyVal) {
      return this.keyVal;
    }

    if (this.data) {
      let idVal = "";
      this.entity.keyFields.forEach((key) => {
        idVal += this.data[key] + "-";
      });
      return idVal;
    }

    throw new Error(
      "Could not get key as the class is not initialized with a keyVal or data"
    );
  }

  // factory method
  static init_target_data<T extends State>(
    this: new (params: { data: any; entity: AbstractEntity }) => T,
    params: { data: any; entity: AbstractEntity }
  ): T {
    return new this(params);
  }

  // factory method
  static init_source_data<T extends State>(
    this: new (params: {
      data: any;
      event_id: number;
      delivery_id: number;
      entity: AbstractEntity;
    }) => T,
    params: {
      data: any;
      event_id: number;
      delivery_id: number;
      entity: AbstractEntity;
    }
  ): T {
    delete params.data.event_id;
    delete params.data.hash;
    delete params.data.delivery_id;

    return new this(params);
  }

  // factory method
  static init_removal_instance<T extends State>(
    this: new (params: {
      event_id: number;
      delivery_id: number;
      keyVal: KeyVal;
      entity: AbstractEntity;
    }) => T,
    event_id: number,
    delivery_id: number,
    keyVal: KeyVal,
    entity: AbstractEntity
  ): T {
    return new this({
      event_id,
      delivery_id,
      keyVal,
      entity: entity,
    });
  }
}

export class EventLogItem {
  event_type?: EventType;
  curr: State;
  prev?: State;

  constructor(event_type: EventType, curr: State, prev?: State) {
    this.event_type = event_type;
    this.curr = curr;
    this.prev = prev;
  }

  static init_with_states<T extends EventLogItem>(
    this: new (event_type: EventType, curr: State, prev?: State) => T,
    event_type: EventType,
    curr: State,
    prev?: State
  ): T {
    return new this(event_type, curr, prev);
  }

  get mask(): string {
    const mask: string[] = [];

    if (this.event_type === "CREATE") {
      Object.keys(this.curr?.data).map((key, i) => {
        mask.push("1");
      });
    }

    if (this.event_type === "REMOVE") {
      Object.keys(this.prev?.data).map((key, i) => {
        mask.push("1");
      });
    }

    if (this.event_type === "AMEND") {
      Object.keys(this.curr?.data).forEach((key, i) => {
        if (
          (this.curr?.data?.[key] === null ||
            this.curr?.data?.[key] === undefined) &&
          (this.prev?.data?.[key] === null ||
            this.prev?.data?.[key] === undefined)
        ) {
        } else {
          mask.push(this.curr?.data[key] === this.prev?.data[key] ? "0" : "1");
        }
      });
    }

    return mask.join("");
  }
}
