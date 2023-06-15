import { CheckoutAttemptIdSession } from './types';

type EventItem = (checkoutAttemptId: CheckoutAttemptIdSession) => Promise<any>;

class EventsQueue {
  public events: EventItem[] = [];

  add(event: EventItem) {
    this.events.push(event);
  }

  run(checkoutAttemptId: CheckoutAttemptIdSession) {
    const promises = this.events.map((e) => e(checkoutAttemptId));
    this.events = [];

    return Promise.all(promises);
  }
}

export default EventsQueue;
