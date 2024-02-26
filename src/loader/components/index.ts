import { PGTarget } from "../../clients/target";
import { AbstractEntity, Entity } from "./entity";
import { EventLogItem, KeyVal, State } from "./event-log";
import { infiniteSequence } from "./event-log-id-generator";
import { Events } from "./types";

interface ComputeEventsParams {
  deliveryId: number;
  entity: AbstractEntity;
  // target: PGTarget;
  nextEventId: number;
  curr: State[];
  prev: State[];
  stateType?: typeof State;
  eventLogType?: typeof EventLogItem;
}

export async function computeEvents({
  deliveryId,
  entity,
  nextEventId,
  curr,
  prev,
  stateType: stateTypeParam,
  eventLogType: eventLogParam,
}: ComputeEventsParams): Promise<Events> {
  const stateType = stateTypeParam || State;
  const eventLogType = eventLogParam || EventLogItem;

  const create: EventLogItem[] = [];
  const amend: EventLogItem[] = [];
  const remove: EventLogItem[] = [];
  // In-memory delivery variables for faster event computation
  const events: Map<KeyVal, State> = new Map(
    prev.map((item) => [item.key, item])
  );

  const itEventId = infiniteSequence(nextEventId); // Assuming this method exists and returns an iterator or similar

  curr.forEach((item, i) => {
    if (i % 100000 === 0) {
      console.info(
        `Delivery ${deliveryId}: ${entity.name} processed ${i}/${curr.length}...`
      );
    }

    const prevItem = events.get(item.key);

    if (prevItem) {
      if (item.hash === prevItem.hash) {
        return; // Skip if the current item is the same as the previous
      }

      item.delivery_id = deliveryId;
      item.event_id = itEventId.next().value;

      const eventLog = eventLogType.init_with_states("AMEND", item, prevItem);
      amend.push(eventLog);
    } else {
      item.delivery_id = deliveryId;
      item.event_id = itEventId.next().value;

      const eventLog = eventLogType.init_with_states("CREATE", item, undefined);
      create.push(eventLog);
    }

    events.set(item.key, item);
  });

  const currKeys = new Set(curr.map((item) => item.key));
  const prevKeys = new Set(events.keys());

  [...prevKeys]
    .filter((prevKey) => !currKeys.has(prevKey))
    .forEach((prevKey) => {
      const item = stateType.init_removal_instance(
        itEventId.next().value,
        deliveryId,
        prevKey,
        entity
      );

      const prevItem = events.get(prevKey);

      const eventLog = eventLogType.init_with_states("REMOVE", item, prevItem);
      remove.push(eventLog);
    });

  return {
    CREATE: create,
    AMEND: amend,
    REMOVE: remove,
  };
}
