// Interacting with Ambar's infra
export { success, errorMustRetry, payloadDecoder };

import * as router from '@/lib/router';
import * as e from '@/lib/json/encoder';
import * as d from '@/lib/json/decoder';
import { EventData, schema_EventData } from '@/lib/eventSourcing/eventStore';
import { Decoder } from '@/lib/json/decoder';
import { Encoder } from '@/lib/json/encoder';
import { Schema } from '@/lib/json/schema';

// Success response from data destination
const success = router.json({
  status: 200,
  content: { result: { success: {} } },
});

// Error response from data destination
const errorMustRetry = (description: string) =>
  router.json({
    status: 200,
    content: {
      result: {
        error: {
          policy: 'must_retry',
          description,
        },
      },
    },
  });

type AmbarHttpRequest<T> = {
  data_source_id: string;
  data_source_description: string;
  data_destination_id: string;
  data_destination_description: string;
  payload: T;
};

// Create a decoded that operates on an AmbarHttpRequest
function payloadDecoder<E>(decoder: Decoder<E>): Decoder<EventData<E>> {
  const dummy: Encoder<E> = new e.Encoder((_) => null);
  const eschema: Schema<EventData<E>> = schema_EventData(
    new Schema(decoder, dummy),
  );
  const reqDecoder: Decoder<AmbarHttpRequest<EventData<E>>> = d.object({
    data_source_id: d.string,
    data_source_description: d.string,
    data_destination_id: d.string,
    data_destination_description: d.string,
    payload: eschema.decoder,
  });

  return reqDecoder.map((v) => v.payload);
}
