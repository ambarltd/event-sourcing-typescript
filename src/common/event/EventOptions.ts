export interface BaseEventOptions {
  eventId: string;
  aggregateId: string;
  aggregateVersion: number;
  correlationId: string;
  causationId: string;
  recordedOn: Date;
}
