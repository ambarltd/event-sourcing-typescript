export { accept };

import { Maybe, Nothing, Just } from '@/lib/Maybe';
import { Decoder } from '@/lib/json/decoder';
import * as d from '@/lib/json/decoder';
import * as s from '@/lib/json/schema';
import { Schema } from '@/lib/json/schema';

type EventConstructor = { type: string; schema: Schema<any> };

// Given some event classes, creates a decoder for those classes.
// Makes sure to error if decoding those class object fail, but
// succeeds if the encoded event was of another class.
//
// To be used in decoding events for projections and reactions.
function accept<T extends [...EventConstructor[]]>(
  ts: T,
): Decoder<Maybe<s.Infer<T[number]['schema']>>> {
  type Ty = s.Infer<T[number]['schema']>;
  return d.object({ type: d.string }).then(({ type: ty }) => {
    const c = ts.find((t) => t.type === ty);
    return c
      ? (c.schema.decoder.map(Just) as Decoder<Maybe<Ty>>)
      : d.succeed(Nothing());
  });
}
