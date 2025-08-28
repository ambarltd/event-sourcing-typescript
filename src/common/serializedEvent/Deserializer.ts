import { Event } from '@/common/event/Event';
import { SerializedEvent } from '@/common/serializedEvent/SerializedEvent';
import { injectable } from 'tsyringe';
import { ApplicationEvaluated } from '@/domain/cookingClub/membership/event/ApplicationEvaluated';
import { ApplicationSubmitted } from '@/domain/cookingClub/membership/event/ApplicationSubmitted';
import { MembershipStatus } from '@/domain/cookingClub/membership/aggregate/membership';

@injectable()
export class Deserializer {
  deserialize(serializedEvent: SerializedEvent): Event {
    const recordedOn = this.parseDateTime(serializedEvent.recorded_on);
    const payload = JSON.parse(serializedEvent.json_payload);

    switch (serializedEvent.event_name) {
      case 'CookingClub_Membership_ApplicationSubmitted':
        return new ApplicationSubmitted(
          this.parseString(serializedEvent.event_id),
          this.parseString(serializedEvent.aggregate_id),
          this.parseNumber(serializedEvent.aggregate_version),
          this.parseString(serializedEvent.correlation_id),
          this.parseString(serializedEvent.causation_id),
          recordedOn,
          this.parseString(payload.firstName),
          this.parseString(payload.lastName),
          this.parseString(payload.favoriteCuisine),
          this.parseNumber(payload.yearsOfProfessionalExperience),
          this.parseNumber(payload.numberOfCookingBooksRead),
        );

      case 'CookingClub_Membership_ApplicationEvaluated':
        return new ApplicationEvaluated(
          this.parseString(serializedEvent.event_id),
          this.parseString(serializedEvent.aggregate_id),
          this.parseNumber(serializedEvent.aggregate_version),
          this.parseString(serializedEvent.correlation_id),
          this.parseString(serializedEvent.causation_id),
          recordedOn,
          this.parseEnum(
            payload.evaluationOutcome,
            MembershipStatus,
            'evaluationOutcome',
          ),
        );

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
