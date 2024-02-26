import { userEntity } from "./entities";
import { loadAllPrivyData } from "../clients/privy";
import { PGTarget } from "../clients/target";
import { User } from "../types";
import { computeEvents } from "./components";
import { State } from "./components/event-log";

export async function create(userData: User) {
  const pgTarget = new PGTarget("stackr_users");

  const prevData = await pgTarget.get_current_state();
  const privyData = await loadAllPrivyData(prevData);

  const delivery = await pgTarget.get_last_delivery_id();

  //INITAL CREATE

  const computedCurrState = prevData.map((user) =>
    State.init_target_data({
      data: user,
    })
  );
  computedCurrState.push(State.init_target_data({ data: userData }));

  const prev = prevData.map((user) =>
    State.init_source_data({
      data: user,
      event_id: user.event_id,
      delivery_id: user.delivery_id,
    })
  );

  const ev = await computeEvents({
    entity: userEntity,
    deliveryId: delivery + 1,
    target: pgTarget,
    curr: computedCurrState,
    prev: prev,
    stateType: State,
  });

  await pgTarget.persist_delivery({
    delivery_id: delivery + 1,
    events: ev,
    start_time: Date.now(),
  });
}

export async function amend(userData: User) {
  const pgTarget = new PGTarget("stackr_users");

  const prevData = await pgTarget.get_current_state();

  const delivery = await pgTarget.get_last_delivery_id();
  // AMEND
  const computedCurrState = prevData.map((user) =>
    State.init_target_data({
      data: user,
    })
  );
  computedCurrState.push(State.init_target_data({ data: userData }));

  const computedPrevState = prevData.map((user) => {
    return State.init_source_data({
      data: user,
      event_id: user.event_id,
      delivery_id: user.delivery_id,
    });
  });

  const ev2 = await computeEvents({
    entity: userEntity,
    deliveryId: delivery + 1,
    target: pgTarget,
    curr: computedCurrState,
    prev: computedPrevState,
    stateType: State,
  });

  await pgTarget.persist_delivery({
    delivery_id: delivery + 1,
    events: ev2,
    start_time: Date.now(),
  });
}

export async function remove(userData: User) {
  const pgTarget = new PGTarget("stackr_users");
  const dbData = await pgTarget.get_current_state();

  const delivery = await pgTarget.get_last_delivery_id();

  const prevVal = dbData.find((user) => user.id === userData.id);
  if (!prevVal) return;

  // REMOVE
  const computedPrevState = [
    State.init_source_data({
      data: prevVal,
      event_id: prevVal.event_id,
      delivery_id: prevVal.delivery_id,
    }),
  ];

  const ev2 = await computeEvents({
    entity: userEntity,
    deliveryId: delivery + 1,
    target: pgTarget,
    curr: [],
    prev: [computedPrevState[computedPrevState.length - 1]!],
    stateType: State,
  });

  await pgTarget.persist_delivery({
    delivery_id: delivery + 1,
    events: ev2,
    start_time: Date.now(),
  });
}
