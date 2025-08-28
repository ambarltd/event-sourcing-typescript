import { Event } from '../event/Event';
import { SerializedEvent } from './SerializedEvent';
import { injectable } from 'tsyringe';
import { ApplicationSubmitted } from '../../domain/cookingClub/membership/event/ApplicationSubmitted';
import { ApplicationEvaluated } from '../../domain/cookingClub/membership/event/ApplicationEvaluated';

@injectable()
export class Serializer {
  serialize(event: Event): SerializedEvent {
    return {
      event_id: event.eventId,
      aggregate_id: event.aggregateId,
      aggregate_version: event.aggregateVersion,
      correlation_id: event.correlationId,
      causation_id: event.causationId,
      recorded_on: this.formatDateTime(event.recordedOn),
      event_name: this.determineEventName(event),
      json_payload: this.createJsonPayload(event),
      json_metadata: '{}',
    };
  }

  private determineEventName(event: Event): string {
    if (event instanceof ApplicationSubmitted) {
      return 'CookingClub_Membership_ApplicationSubmitted';
    }
    if (event instanceof ApplicationEvaluated) {
      return 'CookingClub_Membership_ApplicationEvaluated';
    }
    throw new Error(`Unknown event type: ${event.constructor.name}`);
  }

  private createJsonPayload(event: Event): string {
    const payload: Record<string, any> = {};

    if (event instanceof ApplicationSubmitted) {
      payload['firstName'] = event.firstName;
      payload['lastName'] = event.lastName;
      payload['favoriteCuisine'] = event.favoriteCuisine;
      payload['yearsOfProfessionalExperience'] =
        event.yearsOfProfessionalExperience;
      payload['numberOfCookingBooksRead'] = event.numberOfCookingBooksRead;
    } else if (event instanceof ApplicationEvaluated) {
      payload['evaluationOutcome'] = event.evaluationOutcome;
    }

    return JSON.stringify(payload);
  }

  private formatDateTime(date: Date): string {
    return date.toISOString().replace('Z', ' UTC');
  }
}
