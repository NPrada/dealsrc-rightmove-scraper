import { queueAsPromised } from "fastq";
import { AbstractEntity } from "./entity";
import { EventLogItem } from "./event-log";

export type EventType = "CREATE" | "AMEND" | "REMOVE";
export type Events = Record<EventType, EventLogItem[]>;

export abstract class AbstractTarget {
  abstract entityName: string;
  abstract entity: AbstractEntity;
  abstract get_current_state(
    params: any
  ): Promise<
    Record<
      (typeof this.entity.fields)[number] | "event_id" | "delivery_id" | "hash",
      any
    >[]
  >;
  abstract get_next_event_id(): Promise<number>;
  abstract get_next_delivery_id(): Promise<number>;
  abstract persist_delivery({
    delivery_id,
    events,
    start_time,
  }: {
    delivery_id: number;
    events: Events;
    start_time: number;
  }): Promise<void>;
}

export abstract class LoaderAbstract {
  abstract entity: AbstractEntity;
  abstract target: AbstractTarget;
  abstract q: queueAsPromised<any>;
  abstract process(params: any): Promise<void>;
}
