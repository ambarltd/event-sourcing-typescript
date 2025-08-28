import { Event } from '@/common/event/Event';

export abstract class ProjectionHandler {
  public abstract project(event: Event): Promise<void>;
}
