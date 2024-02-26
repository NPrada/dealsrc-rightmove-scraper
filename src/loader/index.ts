import { computeEvents } from "./components";
import { AbstractEntity } from "./components/entity";
import { State } from "./components/event-log";
import { AbstractTarget, LoaderAbstract } from "./components/types";

import * as fastq from "fastq";
import type { queueAsPromised } from "fastq";

interface ProcessbatchParams {
  newData: Record<AbstractEntity["fields"][number], any>[];
  postcode: string;
}

export class Loader implements LoaderAbstract {
  entity: AbstractEntity;
  target: AbstractTarget;
  q: queueAsPromised<Parameters<typeof this.processNewBatch>[0]>;
  constructor({
    entity,
    target,
  }: {
    entity: AbstractEntity;
    target: AbstractTarget;
  }) {
    this.entity = entity;
    this.target = target;

    this.processNewBatch = this.processNewBatch.bind(this);
    this.q = fastq.promise(this.processNewBatch, 1);
  }

  async process(params: ProcessbatchParams) {
    return await this.q.push(params);
  }

  async processNewBatch({ newData, postcode }: ProcessbatchParams) {
    const [deliveryId, nextEventId, prevData] = await Promise.all([
      this.target.get_next_delivery_id(),
      this.target.get_next_event_id(),
      this.target.get_current_state({
        postcode_area: postcode,
      }),
    ]);

    const prev = prevData.map((data) =>
      State.init_source_data({
        data,
        event_id: data.event_id,
        delivery_id: data.delivery_id,
        entity: this.entity,
      })
    );

    const curr = newData.map((data) =>
      State.init_target_data({
        data,
        entity: this.entity,
      })
    );

    const events = await computeEvents({
      curr: curr,
      prev: prev,
      entity: this.entity,
      nextEventId: nextEventId,
      deliveryId: deliveryId,
    });

    await this.target.persist_delivery({
      delivery_id: deliveryId,
      events,
      start_time: Date.now(),
    });
  }
}
