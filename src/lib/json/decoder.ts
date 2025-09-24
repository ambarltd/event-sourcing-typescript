/* A type-safe monadic decoder combinators.
 *
 * Use like this:
 *
 *   import * as Decoder from "@root/lib/decoder";
 *
 *   type Test = {
 *     one: number,
 *     two: boolean,
 *     three: {
 *       inner: string
 *     }
 *   };
 *
 *   const testDecoder : Decoder<Test> = object({
 *     one: Decoder.number,
 *     two: Decoder.boolean,
 *     three: Decoder.object({
 *       inner: Decoder.string
 *     })
 *   });
 *
 *
 *   const decodeJSON = (s : string) => Decoder.decode(JSON.decode(s), testDecoder);
 */
export {
  type FromJSON,
  type Infer,
  type Decoder, // export only the abstract type, not constructors.
  type DecoderDef,
  type DecodeResult,
  decode,
  object,
  objectMap,
  pair,
  array,
  string,
  number,
  boolean,
  any,
  json,
  nullP,
  stringNumber,
  undefinedP,
  oneOf,
  maybe,
  nullable,
  stringLiteral,
  triple,
  always,
  fail,
  failure,
  optional,
  succeed,
};

import { Result, Success, Failure, traverse } from '@/lib/Result';
import { Maybe, Just, Nothing, Nullable } from '@/lib/Maybe';
import { List } from '@/lib/List';
import { Json } from '@/lib/json/types';

// Infer the type from a decoder definition
type Infer<A extends Decoder<unknown>> = A extends Decoder<infer B> ? B : never;

// A type that can be decoded from JSON.
interface FromJSON<T> {
  decoder(): Decoder<T>;
}

class Decoder<T> {
  readonly run: (input: unknown) => DecodeResult<T>;
  constructor(run: (input: unknown) => DecodeResult<T>) {
    this.run = run;
  }

  then<W>(f: (v: T) => Decoder<W>): Decoder<W> {
    return new Decoder((u) => this.run(u).then((v) => f(v).run(u)));
  }

  map<W>(f: (v: T) => W): Decoder<W> {
    return new Decoder((v) => this.run(v).map<W>(f));
  }
}

function decode<T>(input: unknown, decoder: Decoder<T>): Result<string, T> {
  return decoder.run(input).mapFailure(showPath);
}

function showPath([path, error]: [Path, string]): string {
  return error + '. When parsing: ' + Array.from(path).join('.');
}

type DecodeResult<T> = Result<[Path, string], T>;
type Path = List<string>;

const failure = <T>(msg: string): DecodeResult<T> =>
  Failure([List.empty(), msg]);

const fail = <T>(msg: string): Decoder<T> =>
  new Decoder((_) => Failure([List.empty(), msg]));

const always = <T>(v: T): Decoder<T> => new Decoder((_) => Success(v));

const succeed = always;

const any: Decoder<unknown> = new Decoder((v) => Success(v));

const string: Decoder<string> = new Decoder((v) =>
  typeof v === 'string'
    ? Success(v)
    : failure('expected string but found ' + typeof v),
);

const number: Decoder<number> = new Decoder((v) =>
  typeof v === 'number'
    ? Success(v)
    : failure('expected number but found ' + typeof v),
);

const stringNumber: Decoder<number> = string.then((s) => {
  const v = parseInt(s, 10);
  return isNaN(v) ? fail('not a valid number: ' + s) : succeed(v);
});

const boolean: Decoder<boolean> = new Decoder((v) =>
  typeof v === 'boolean'
    ? Success(v)
    : failure('expected boolean but found ' + typeof v),
);

const array = <V>(decodeValue: Decoder<V>): Decoder<Array<V>> =>
  new Decoder((input) => {
    if (!Array.isArray(input)) {
      return failure('expected array but found ' + typeof input);
    }

    return traverse(List.from(input), decodeValue.run).map((list) =>
      Array.from(list),
    );
  });

type DecoderDef<A> = {
  [P in keyof A]: Decoder<A[P]>;
};

// Ignores extra properties.
const object = <A>(decoders: DecoderDef<A>): Decoder<A> =>
  new Decoder((input) => {
    if (typeof input !== 'object' || input === null) {
      return failure('expected object but found ' + typeof input);
    }
    const obj = input as { [P in keyof A]: unknown };

    const result = {} as A;
    for (const field in decoders) {
      const decoder = decoders[field];
      const decoded = decoder.run(obj[field]);
      switch (true) {
        case decoded instanceof Success:
          result[field] = decoded.value;
          break;
        case decoded instanceof Failure: {
          const [path, msg] = decoded.error;
          return Failure([List.cons(field, path), msg]);
        }
        default:
          return decoded satisfies never;
      }
    }

    return Success(result);
  });

type ObjectMap<A> = { [x: string]: A };

const objectMap = <A>(decoder: Decoder<A>): Decoder<ObjectMap<A>> =>
  new Decoder((input) => {
    if (typeof input !== 'object' || input === null) {
      return failure('expected object but found ' + typeof input);
    }

    const result = {} as ObjectMap<A>;
    for (const field in input) {
      // @ts-ignore
      const decoded = decoder.run(input[field]);
      switch (true) {
        case decoded instanceof Success:
          result[field] = decoded.value;
          break;
        case decoded instanceof Failure: {
          const [path, msg] = decoded.error;
          return Failure([List.cons(field, path), msg]);
        }
        default:
          return decoded satisfies never;
      }
    }

    return Success(result);
  });

const pair = <L, R>(
  ldecode: Decoder<L>,
  rdecode: Decoder<R>,
): Decoder<[L, R]> =>
  new Decoder((input) => {
    if (!Array.isArray(input)) {
      return failure('expected array but found ' + typeof input);
    }
    if (input.length !== 2) {
      return failure(
        'expected array with 2 elements but it found ' + input.length,
      );
    }
    const [l, r] = input;

    return ldecode
      .run(l)
      .then((left) => rdecode.run(r).then((right) => Success([left, right])));
  });

const triple = <A, B, C>(
  pA: Decoder<A>,
  pB: Decoder<B>,
  pC: Decoder<C>,
): Decoder<[A, B, C]> =>
  new Decoder((input) => {
    if (!Array.isArray(input)) {
      return failure('expected array but found ' + typeof input);
    }
    if (input.length !== 3) {
      return failure(
        'expected array with 3 elements but it found ' + input.length,
      );
    }
    const [ia, ib, ic] = input;

    return pA
      .run(ia)
      .then((a) =>
        pB.run(ib).then((b) => pC.run(ic).then((c) => Success([a, b, c]))),
      );
  });

const oneOf = <V>(decoders: Array<Decoder<V>>): Decoder<V> =>
  new Decoder((input) => {
    let decoded: DecodeResult<V> = failure('no decoders');

    const errors: Array<[Path, string]> = [];

    for (const decoder of decoders) {
      decoded = decoder.run(input);
      if (decoded instanceof Success) {
        return decoded;
      }
      errors.push(decoded.error);
    }

    return Failure<[Path, string], V>([
      List.empty(),
      errors.map(showPath).join('\n'),
    ]);
  });

const maybe = <V>(decoder: Decoder<V>): Decoder<Maybe<V>> =>
  oneOf([nullP.map((_) => Nothing()), decoder.map(Just<V>)]);

const nullable = <V>(decoder: Decoder<V>): Decoder<Nullable<V>> =>
  oneOf([nullP, decoder]);

const nullP: Decoder<null> = new Decoder((v) =>
  v === null ? Success(null) : failure('expected null but found ' + typeof v),
);

const undefinedP: Decoder<undefined> = new Decoder((v) =>
  v === undefined
    ? Success(undefined)
    : failure('expected `undefined` ' + typeof v),
);

// Useful for parsing tag names in discriminated unions.
const stringLiteral = <T extends string>(str: T): Decoder<T> =>
  new Decoder((v) =>
    v === str ? Success(v as T) : failure(`expected '${str}' but found '${v}'`),
  );

// An object field that may be absent.
const optional = <V>(decoder: Decoder<V>): Decoder<Maybe<V>> =>
  oneOf([decoder.map(Just<V>), undefinedP.map((_) => Nothing())]);

// Define a recursive decoder
function rec<A>(f: (p: Decoder<A>) => Decoder<A>): Decoder<A> {
  const base: Decoder<A> = fail(
    'A recursive decoder cannot immediately call itself.',
  );
  const top = f(base);
  // @ts-expect-error will complain that 'run' is readonly. But we are doing this on purpose here.
  base.run = top.run;
  return top;
}

const json: Decoder<Json> = rec((json) =>
  oneOf<Json>([nullP, string, number, boolean, array(json), objectMap(json)]),
);
