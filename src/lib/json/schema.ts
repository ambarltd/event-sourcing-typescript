// A Schema<A> contains information to encode and decode a value.
//
// This allows us to have safe coversion to and from JSON
export {
  Schema,
  type Infer,
  type SchemaDef,
  object,
  pair,
  triple,
  map,
  boolean,
  number,
  string,
  array,
  json,
  maybe,
  nullable,
  optional,
  stringLiteral,
  oneOf,
  from,
  decode,
  encode,
  decoder,
  encoder,
};

import * as decoder from '@/lib/json/decoder';
import * as encoder from '@/lib/json/encoder';
import { Result } from '@/lib/Result';
import { Decoder, DecoderDef } from '@/lib/json/decoder';
import * as D from '@/lib/json/decoder';
import { Encoder, EncoderDef } from '@/lib/json/encoder';
import { Json } from '@/lib/json/types';
import * as E from '@/lib/json/encoder';
import { List } from '@/lib/List';
import { Maybe, Nullable } from '@/lib/Maybe';

// Infer the type from a schema definition
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Infer<A extends Schema<any>> = A extends Schema<infer B> ? B : never;

class Schema<A> {
  decoder: Decoder<A>;
  encoder: Encoder<A>;

  constructor(decoder: Decoder<A>, encoder: Encoder<A>) {
    this.decoder = decoder;
    this.encoder = encoder;
  }

  dimap<W>(p: (v: A) => W, s: (v: W) => A): Schema<W> {
    return new Schema(this.decoder.map(p), this.encoder.rmap(s));
  }

  then<W>(p: (v: A) => Result<string, W>, s: (v: W) => A): Schema<W> {
    return new Schema(
      this.decoder.then((v) => p(v).mapFailure((e) => [List.empty(), e])),
      this.encoder.rmap(s),
    );
  }
}

function decode<A>(schema: Schema<A>, input: unknown): Result<string, A> {
  return D.decode(input, schema.decoder);
}

function encode<A>(schema: Schema<A>, input: A): Json {
  return schema.encoder.run(input);
}

// Create a Schema
function from<A>(decoder: Decoder<A>, encoder: Encoder<A>): Schema<A> {
  return new Schema(decoder, encoder);
}

type SchemaDef<A> = {
  [D in keyof A]: Schema<A[D]>;
};

const json: Schema<Json> = new Schema(D.json, E.json);
const boolean: Schema<boolean> = new Schema(D.boolean, E.boolean);
const number: Schema<number> = new Schema(D.number, E.number);
const string: Schema<string> = new Schema(D.string, E.string);

const array = <A>(schema: Schema<A>): Schema<Array<A>> =>
  new Schema(D.array(schema.decoder), E.array(schema.encoder));

function object<A>(def: SchemaDef<A>): Schema<A> {
  const pdef = {} as DecoderDef<A>;
  const sdef = {} as EncoderDef<A>;
  for (const key in def) {
    const schema = def[key];
    pdef[key] = schema.decoder;
    sdef[key] = schema.encoder;
  }

  const decoder: Decoder<A> = D.object(pdef);
  const encoder: Encoder<A> = E.object(sdef);
  return new Schema(decoder, encoder);
}

const pair = <L, R>(l: Schema<L>, r: Schema<R>): Schema<[L, R]> => {
  const decoder = D.pair(l.decoder, r.decoder);
  const encoder = E.pair(l.encoder, r.encoder);
  return new Schema(decoder, encoder);
};

const triple = <A, B, C>(
  a: Schema<A>,
  b: Schema<B>,
  c: Schema<C>,
): Schema<[A, B, C]> => {
  const decoder = D.triple(a.decoder, b.decoder, c.decoder);
  const encoder = E.triple(a.encoder, b.encoder, c.encoder);
  return new Schema(decoder, encoder);
};

const map = <A>(s: Schema<A>): Schema<Map<string, A>> =>
  array(pair(string, s)).dimap(
    (xs) => xs.reduce((acc, [k, v]) => acc.set(k, v), new Map<string, A>()),
    (m) => Array.from(m.entries()),
  );

const maybe = <A>(s: Schema<NonNullable<A>>): Schema<Maybe<NonNullable<A>>> =>
  new Schema(D.maybe(s.decoder), E.maybe(s.encoder));

// An object field that may be absent.
const optional = <A>(
  s: Schema<NonNullable<A>>,
): Schema<Maybe<NonNullable<A>>> =>
  new Schema(D.optional(s.decoder), E.maybe(s.encoder));

const nullable = <A>(s: Schema<A>): Schema<Nullable<A>> =>
  new Schema(D.nullable(s.decoder), E.nullable(s.encoder));

const stringLiteral = <T extends string>(str: T): Schema<T> =>
  new Schema(
    D.stringLiteral(str),
    E.string.rmap((input) => {
      if (input != str) {
        throw new Error(`Cannot encode '${input}'. Expected literal '${str}'"`);
      }
      return input;
    }),
  );

const oneOf = <V>(f: (v: V) => Schema<V>, ss: Array<Schema<V>>): Schema<V> =>
  new Schema(
    D.oneOf(ss.map((s) => s.decoder)),
    E.oneOf((v) => f(v).encoder),
  );
