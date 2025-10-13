// An Encoder is the opposite of a Decoder.
//
// It takes a structured value and transforms it into
// an object of type 'any'.
export {
  type Infer,
  Encoder,
  type EncoderDef,
  json,
  boolean,
  number,
  string,
  array,
  object,
  pair,
  maybe,
  nullable,
  triple,
  optional,
  oneOf,
  both,
};

import { Maybe, Nothing, Just, Nullable } from '@/lib/Maybe';
import { Json, JsonObject } from '@/lib/json/types';

// Infer the type from a encoder definition
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Infer<A extends Encoder<any>> = A extends Encoder<infer B> ? B : never;

class Encoder<A> {
  run: (v: A) => Json;
  constructor(f: (v: A) => Json) {
    this.run = f;
  }

  rmap<W>(f: (v: W) => A): Encoder<W> {
    return new Encoder((v) => this.run(f(v)));
  }
}

type EncoderDef<A> = {
  [P in keyof A]: Encoder<A[P]>;
};

const toAny = <T extends Json>(): Encoder<T> => new Encoder((v) => v);

// Encode two values into a single one.
// Conflicts result in properties being ovewritten.
const both = <T, U>(left: Encoder<T>, right: Encoder<U>): Encoder<[T, U]> =>
  new Encoder(([l, r]) => {
    return Object.assign({}, left.run(l), right.run(r));
  });

const json: Encoder<Json> = toAny();
const boolean: Encoder<boolean> = toAny();
const number: Encoder<number> = toAny();
const string: Encoder<string> = toAny();

const array = <A>(encoder: Encoder<A>): Encoder<Array<A>> =>
  new Encoder((input: Array<A>) => input.map(encoder.run));

const object = <A>(encoders: EncoderDef<A>): Encoder<A> =>
  new Encoder((input) => {
    const result = {} as JsonObject;
    for (const field in encoders) {
      const encoder = encoders[field];
      const encoded = encoder.run(input[field]);
      result[field] = encoded;
    }

    return result;
  });

const pair = <L, R>(sleft: Encoder<L>, sright: Encoder<R>): Encoder<[L, R]> =>
  new Encoder((input) => {
    const [left, right] = input;
    return [sleft.run(left), sright.run(right)];
  });

const triple = <A, B, C>(
  sA: Encoder<A>,
  sB: Encoder<B>,
  sC: Encoder<C>,
): Encoder<[A, B, C]> =>
  new Encoder((input) => {
    const [a, b, c] = input;
    return [sA.run(a), sB.run(b), sC.run(c)];
  });

const maybe = <V>(
  encoder: Encoder<NonNullable<V>>,
): Encoder<Maybe<NonNullable<V>>> =>
  new Encoder((input) =>
    input instanceof Nothing ? null : encoder.run(input.value),
  );

const nullable = <V>(encoder: Encoder<V>): Encoder<Nullable<V>> =>
  new Encoder((input) => (input === null ? null : encoder.run(input)));

// Encode a field that may not be there as a maybe.
const optional = <V>(
  encoder: Encoder<NonNullable<V>>,
): Encoder<NonNullable<V> | undefined> =>
  new Encoder((input) => {
    if (typeof input === 'undefined') {
      return maybe(encoder).run(Nothing());
    }
    return maybe(encoder).run(Just(input));
  });

const oneOf = <V>(f: (v: V) => Encoder<V>): Encoder<V> =>
  new Encoder((input) => {
    const encoder = f(input);
    return encoder.run(input);
  });
