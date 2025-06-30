export type EventProps<T> = T & {
  eventId: string;
  aggregateId: string;
  aggregateVersion: number;
  correlationId: string;
  causationId: string;
  recordedOn: Date;
};

export abstract class Event {
  public readonly eventId: string;
  public readonly aggregateId: string;
  public readonly aggregateVersion: number;
  public readonly correlationId: string;
  public readonly causationId: string;
  public readonly recordedOn: Date;

  constructor(props: EventProps<unknown>) {
    this.eventId = props.eventId;
    this.aggregateId = props.aggregateId;
    this.aggregateVersion = props.aggregateVersion;
    this.correlationId = props.correlationId;
    this.causationId = props.causationId;
    this.recordedOn = props.recordedOn;

    Object.assign(this, props);
  }
}
