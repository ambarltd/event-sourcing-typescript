import { BaseEventOptions } from './EventOptions';

export abstract class Event {
  public readonly eventId: string;
  public readonly aggregateId: string;
  public readonly aggregateVersion: number;
  public readonly correlationId: string;
  public readonly causationId: string;
  public readonly recordedOn: Date;

  constructor(options: BaseEventOptions) {
    this.eventId = options.eventId;
    this.aggregateId = options.aggregateId;
    this.aggregateVersion = options.aggregateVersion;
    this.correlationId = options.correlationId;
    this.causationId = options.causationId;
    this.recordedOn = options.recordedOn;
  }
}
