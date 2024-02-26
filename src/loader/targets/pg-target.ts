import { Pool, PoolClient, PoolConfig, types } from "pg";
import { EventLogItem } from "../components/event-log";
import { AbstractTarget, Events } from "../components/types";
import { AbstractEntity } from "../components/entity";

// Custom timestamp parser
const parseTimestamp = (value: string) => {
  // Parse the timestamp value and return it as a JavaScript Date object in UTC
  return new Date(value + "Z");
};

// Override the default timestamp parser
types.setTypeParser(types.builtins.TIMESTAMP, parseTimestamp);

export class PGTarget extends AbstractTarget {
  entityName: string;
  pool: Pool;
  entity: AbstractEntity;

  constructor(entity: AbstractEntity, poolConfig: PoolConfig) {
    super();
    this.entity = entity;
    this.entityName = entity.name;
    this.pool = new Pool(poolConfig);
  }

  async get_current_state(params: {
    filters?: Record<string, string>[];
  }): Promise<any[]> {
    const { filters = [] } = params;
    try {
      let query = `SELECT * FROM mastercollector.${this.entityName}`;
      const values: string[] = [];
      let whereClauses: string[] = [];

      filters.forEach((filterObj, index) => {
        const conditions: string[] = Object.entries(filterObj).map(
          ([field, value], fieldIndex) => {
            values.push(value);
            return `"${field}" = $${values.length}`;
          }
        );
        whereClauses.push(`(${conditions.join(" AND ")})`);
      });

      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(" OR ")}`;
      }

      const res = await this.pool.query(query, values);
      return res.rows;
    } catch (error) {
      throw error;
    }
  }

  async get_last_event_id(): Promise<number> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM mastercollector.${this.entityName}_event_log ORDER BY event_id DESC LIMIT 1`
      );
      return Number(res.rows[0]?.event_id) || 0;
    } catch (error) {
      throw error;
    }
  }

  async get_last_delivery_id(): Promise<number> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM mastercollector.${this.entityName}_event_log ORDER BY delivery_id DESC LIMIT 1`
      );
      return Number(res.rows[0]?.delivery_id) || 0;
    } catch (error) {
      throw error;
    }
  }

  async get_next_event_id(): Promise<number> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM mastercollector.${this.entityName}_event_log ORDER BY event_id DESC LIMIT 1`
      );
      return (Number(res.rows[0]?.event_id) || 0) + 1;
    } catch (error) {
      throw error;
    }
  }

  async get_next_delivery_id(): Promise<number> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM mastercollector.${this.entityName}_event_log ORDER BY delivery_id DESC LIMIT 1`
      );
      return (Number(res.rows[0]?.delivery_id) || 0) + 1;
    } catch (error) {
      throw error;
    }
  }

  async persist_delivery({
    delivery_id,
    events,
    start_time,
  }: {
    delivery_id: number;
    events: Events;
    start_time: number;
  }) {
    const client = await this.pool.connect();
    const pgDeliveryPersist = new PGDeliveryPersist(client, this.entity);
    await pgDeliveryPersist.persist({ delivery_id, events, start_time });
  }
}

class PGDeliveryPersist {
  entityName: string;
  entity: AbstractEntity;
  private client: PoolClient;
  constructor(client: PoolClient,   entity: AbstractEntity) {
    this.client = client;
    this.entityName = entity.name;
    this.entity = entity;
  }

  async persist({
    delivery_id,
    events,
    start_time,
  }: {
    delivery_id: number;
    events: Events;
    start_time: number;
  }): Promise<void> {
    try {
      await this.client.query("BEGIN");

      let eventsPromises: Promise<any>[] = [];
      for (const event of events.CREATE) {
        eventsPromises.push(this.persist_event({ delivery_id, event }));
      }

      for (const event of events.AMEND) {
        eventsPromises.push(this.persist_event({ delivery_id, event }));
      }

      for (const event of events.REMOVE) {
        eventsPromises.push(this.persist_event({ delivery_id, event }));
      }

      await Promise.all(eventsPromises);

      const hasNoEvents =
        events.AMEND.length === 0 &&
        events.CREATE.length === 0 &&
        events.REMOVE.length === 0;

      if (hasNoEvents) {
        console.log(`no events to persist!`);
      } else {
        console.log(`persisted delivery! (${delivery_id})`);
      }

      await this.client.query("COMMIT");
    } catch (error) {
      console.log("err! should roll back!", error);
      await this.client.query("ROLLBACK");
      throw error;
    } finally {
      this.client.release();
    }
  }

  // will persist the event information to the event log
  private async write_event_to_event_log({
    delivery_id,
    event,
  }: {
    delivery_id: number;
    event: EventLogItem;
  }) {
    const currData = event.curr.data;
    const prevData = event.prev?.data;

    //WRITE TO EVENT LOG
    const currFields = this.entity.fields.map((field) => `curr_${field}`);
    const prevFields = this.entity.fields.map((field) => `prev_${field}`);

    const tableColumns = `delivery_id, event_id, event_type, ${currFields.join(
      ","
    )}, curr_hash, prev_event_id, prev_delivery_id, ${prevFields.join(
      ","
    )}, prev_hash, mask`;
    const tableInserts = createArrayThroughN(
      currFields.length + prevFields.length + 8
    )
      .map((el) => `$${el}`)
      .join(", ");
    const queryEventLog = `INSERT INTO mastercollector.${this.entityName}_event_log (${tableColumns}) VALUES(${tableInserts})`;

    await this.client.query(queryEventLog, [
      delivery_id,
      event.curr.event_id,
      event.event_type,
      ...this.entity.data_to_tuple(currData),
      event.curr.hash,
      event.prev?.event_id,
      event.prev?.delivery_id,
      ...this.entity.data_to_tuple(prevData),
      event.prev?.hash,
      event.mask,
    ]);
  }

  // will apply the event to the state table
  private async persist_event({
    delivery_id,
    event,
  }: {
    delivery_id: number;
    event: EventLogItem;
  }) {
    await this.write_event_to_event_log({ delivery_id, event });

    try {
      //CREATE
      if (event.event_type === "CREATE") {
        //WRITE TO TABLE
        const currData = event.curr.data;
        const queryDataTable = `
          INSERT INTO mastercollector.${this.entityName} 
          (${this.entity.fields.join(",")}, hash, event_id, delivery_id ) 
          VALUES(${createArrayThroughN(this.entity.fields.length + 3)
            .map((el) => `$${el}`)
            .join(", ")})`;
        await this.client.query(queryDataTable, [
          ...this.entity.data_to_tuple(currData),
          event.curr.hash,
          event.curr.event_id,
          delivery_id,
        ]);
      }

      //AMEND
      if (event.event_type === "AMEND") {
        //WRITE TO TABLE
        const currData = event.curr.data;
        const queryDataTable = `
            INSERT INTO mastercollector.${this.entityName} 
            (${this.entity.fields.join(",")}, hash, event_id, delivery_id) 
            VALUES(${createArrayThroughN(this.entity.fields.length + 3)
              .map((el) => `$${el}`)
              .join(", ")})
            ON CONFLICT (${this.entity.keyFields}) DO UPDATE SET
            ${this.entity.fields
              .map((field) => `${field} = EXCLUDED.${field}`)
              .join(", ")},
            hash = EXCLUDED.hash,
            event_id = EXCLUDED.event_id,
            delivery_id = EXCLUDED.delivery_id
          `;

        await this.client.query(queryDataTable, [
          ...this.entity.data_to_tuple(currData),
          event.curr.hash,
          event.curr.event_id,
          delivery_id,
        ]);
      }

      if (event.event_type === "REMOVE") {
        //WRITE TO TABLE
        const prevData = event.prev?.data;
        const buildtWhereClauses = this.entity.keyFields
          .map((el, i) => `${el} = $${i + 1}`)
          .join(" AND ");

        const queryDataTable = `
            DELETE FROM mastercollector.${this.entityName} WHERE ${buildtWhereClauses}
          `;

        await this.client.query(queryDataTable, [
          ...this.entity.keyFields.map((field) => prevData[field]),
        ]);
      }
    } catch (error) {
      if (error instanceof Error) {
        error.message = `Error persisting event: ${
          error.message
        } | event: ${JSON.stringify(event)}`;
      }
      throw error;
    }
  }
}

const createArrayThroughN = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => i + 1);

export const target = new PGTarget("stackr_users");
