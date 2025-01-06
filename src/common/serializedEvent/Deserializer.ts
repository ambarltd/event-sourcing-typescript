import { Event } from '../event/Event';
import { SerializedEvent } from './SerializedEvent';
import { injectable } from "tsyringe";
import { ApplicationEvaluated } from "../../domain/cookingClub/membership/event/applicationEvaluated";
import { ApplicationSubmitted } from "../../domain/cookingClub/membership/event/applicationSubmitted";
import { typeSafeCoercion } from "../util/TypeSafeCoercion";
import {MembershipStatus} from "../../domain/cookingClub/membership/aggregate/membership";

@injectable()
export class Deserializer {
    deserialize(serializedEvent: SerializedEvent): Event {
        const recordedOn = this.parseDateTime(serializedEvent.recorded_on);
        const payload = JSON.parse(serializedEvent.json_payload);

        switch (serializedEvent.event_name) {
            case 'CookingClub_Membership_ApplicationSubmitted':
                return typeSafeCoercion<ApplicationSubmitted>(new ApplicationSubmitted(
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
                    this.parseNumber(payload.numberOfCookingBooksRead)
                ));

            case 'CookingClub_Membership_ApplicationEvaluated':
                return typeSafeCoercion<ApplicationEvaluated>(new ApplicationEvaluated(
                    this.parseString(serializedEvent.event_id),
                    this.parseString(serializedEvent.aggregate_id),
                    this.parseNumber(serializedEvent.aggregate_version),
                    this.parseString(serializedEvent.correlation_id),
                    this.parseString(serializedEvent.causation_id),
                    recordedOn,
                    this.parseString(payload.evaluationOutcome) as MembershipStatus
                ));

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
}