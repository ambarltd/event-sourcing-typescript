import { Event } from '../event/Event';
import { SerializedEvent } from './SerializedEvent';
import { injectable } from 'tsyringe';
import {
  MembershipStatus,
  ApplicationEvaluated,
  ApplicationSubmitted,
  ApplicationSubmittedProps,
  ApplicationEvaluatedProps,
} from '../../domain/cookingClub/membership';
@injectable()
export class Deserializer {
  deserialize(serializedEvent: SerializedEvent): Event {
    const recordedOn = this.parseDateTime(serializedEvent.recorded_on);
    const payload = JSON.parse(serializedEvent.json_payload);

    switch (serializedEvent.event_name) {
      case 'CookingClub_Membership_ApplicationSubmitted':
        const applicationSubmittedProps: ApplicationSubmittedProps = {
          eventId: this.parseString(serializedEvent.event_id),
          aggregateId: this.parseString(serializedEvent.aggregate_id),
          aggregateVersion: this.parseNumber(serializedEvent.aggregate_version),
          correlationId: this.parseString(serializedEvent.correlation_id),
          causationId: this.parseString(serializedEvent.causation_id),
          recordedOn,
          firstName: this.parseString(payload.firstName),
          lastName: this.parseString(payload.lastName),
          favoriteCuisine: this.parseString(payload.favoriteCuisine),
          yearsOfProfessionalExperience: this.parseNumber(
            payload.yearsOfProfessionalExperience,
          ),
          numberOfCookingBooksRead: this.parseNumber(
            payload.numberOfCookingBooksRead,
          ),
        };
        return new ApplicationSubmitted(applicationSubmittedProps);

      case 'CookingClub_Membership_ApplicationEvaluated':
        const applicationEvaluatedProps: ApplicationEvaluatedProps = {
          eventId: this.parseString(serializedEvent.event_id),
          aggregateId: this.parseString(serializedEvent.aggregate_id),
          aggregateVersion: this.parseNumber(serializedEvent.aggregate_version),
          correlationId: this.parseString(serializedEvent.correlation_id),
          causationId: this.parseString(serializedEvent.causation_id),
          recordedOn,
          evaluationOutcome: this.parseEnum(
            payload.evaluationOutcome,
            MembershipStatus,
            'evaluationOutcome',
          ),
        };
        return new ApplicationEvaluated(applicationEvaluatedProps);

      default:
        throw new Error(`Unknown event type: ${serializedEvent.event_name}`);
    }
  }

  private parseDateTime(dateStr: string): Date {
    if (!dateStr.endsWith(' UTC')) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    const parsed = new Date(dateStr.slice(0, -4) + 'Z');
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    return parsed;
  }

  private parseString(value: any): string {
    if (typeof value !== 'string') {
      throw new Error(`Expected string but got ${typeof value}`);
    }
    return value;
  }

  private parseNumber(value: any): number {
    const parsed = Number(value);
    if (isNaN(parsed)) {
      throw new Error(`Expected number but got ${typeof value}`);
    }
    return parsed;
  }

  private parseEnum<T extends { [key: string]: string }>(
    value: any,
    enumType: T,
    fieldName: string,
  ): T[keyof T] {
    if (typeof value !== 'string') {
      throw new Error(
        `Expected string for ${fieldName} but got ${typeof value}`,
      );
    }

    if (!Object.values(enumType).includes(value)) {
      throw new Error(
        `Invalid ${fieldName}: ${value}. Expected one of: ${Object.values(enumType).join(', ')}`,
      );
    }

    return value as T[keyof T];
  }
}
