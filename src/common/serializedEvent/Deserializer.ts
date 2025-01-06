import { Event } from '../event/Event';
import { SerializedEvent } from './SerializedEvent';
import {injectable} from "tsyringe";
import {ApplicationEvaluated} from "../../domain/cookingClub/membership/event/applicationEvaluated";
import {ApplicationSubmitted} from "../../domain/cookingClub/membership/event/applicationSubmitted";

@injectable()
export class Deserializer {
    deserialize(serializedEvent: SerializedEvent): Event {
        const recordedOn = this.parseDateTime(serializedEvent.recorded_on);
        const payload = JSON.parse(serializedEvent.json_payload);

        switch (serializedEvent.event_name) {
            case 'CookingClub_Membership_ApplicationSubmitted':
                return new ApplicationSubmitted(
                    serializedEvent.event_id,
                    serializedEvent.aggregate_id,
                    serializedEvent.aggregate_version,
                    serializedEvent.correlation_id,
                    serializedEvent.causation_id,
                    recordedOn,
                    payload.firstName,
                    payload.lastName,
                    payload.favoriteCuisine,
                    payload.yearsOfProfessionalExperience,
                    payload.numberOfCookingBooksRead
                );
            case 'CookingClub_Membership_ApplicationEvaluated':
                return new ApplicationEvaluated(
                    serializedEvent.event_id,
                    serializedEvent.aggregate_id,
                    serializedEvent.aggregate_version,
                    serializedEvent.correlation_id,
                    serializedEvent.causation_id,
                    recordedOn,
                    payload.evaluationOutcome,
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
}