import { DomainEvent, DomainEventProps } from '../base';

export class UnknownEvent extends DomainEvent {
  constructor(props: DomainEventProps<{ eventName: string }>) {
    super(props);
  }
}
