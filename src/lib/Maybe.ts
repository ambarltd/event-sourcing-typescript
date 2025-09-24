/*
Maybe<T> is a type which represents the existence of absence of values in a
robust and unambiguous manner.

Values can be extracted using `instsanceof` tests.

    switch (true) {
        case x instanceof Just:
            // use x.value here
            break;
        case x instanceof Nothing:
            break;
        default:
            x satisfies never;
   }
*/
export {
  type Maybe,
  type Nullable,
  type Infer,
  CallableJust as Just,
  CallableNothing as Nothing,
  from,
  catMaybes,
  mapMaybe,
};

import Callable from '@/lib/Callable';

type Maybe<T> = Just<T> | Nothing<T>;
type Nullable<T> = T | null;

// Infer the type from a Maybe definition
type Infer<A extends Maybe<unknown>> = A extends Maybe<infer B> ? B : never;

// prettier-ignore
export interface IMaybe<T> {
  isJust() : boolean;
  isNothing() : boolean;
  map<W>(f: (t: T) => W) : Maybe<W>
  withDefault(def: T) : T
  expect(msg : string) : T
  maybe<W>(def: W, f: (t: T) => W) : W
  unwrap<W>(f: () => W, g: (t:T) => W) : W
  then<W>(f : (t: T) => Maybe<W>) : Maybe<W>
  alt(other: Maybe<T>) : Maybe<T>
  asNullable() : Nullable<T>
}

// prettier-ignore
class Just<T> implements IMaybe<T> {
  static new<W>(v:W) : Just<W> { return new Just(v); }

  readonly value : T;
  constructor(v: T) { this.value = v; }

  isJust() { return true; }
  isNothing() { return false; }
  map<W>(f: (t: T) => W) : Maybe<W> { return new Just(f(this.value)); }
  withDefault(_: T) { return this.value; }
  expect(_ : string) : T { return this.value }
  maybe<W>(_: W, f: (t: T) => W) : W { return f(this.value); }
  unwrap<W>(_: () => W, g: (t:T) => W) : W { return g(this.value); }
  then<W>(f : (t: T) => Maybe<W>) : Maybe<W> { return f(this.value); }
  alt(_: Maybe<T>) : Maybe<T> { return this }
  asNullable() { return this.value }
}

// prettier-ignore
class Nothing<T> implements IMaybe<T> {
  static new<T>() : Nothing<T> { return new Nothing(); }
  constructor() {}

  isJust() { return false; }
  isNothing() { return true; }
  map<W>(_: (t: T) => W) : Maybe<W> { return new Nothing(); }
  withDefault(d: T) { return d; }
  expect(msg : string) : T { throw new Error(msg); }
  maybe<W>(def: W, _: (t: T) => W) : W { return def; }
  unwrap<W>(f: () => W, _: (t:T) => W) : W { return f(); }
  then<W>(_ : (t: T) => Maybe<W>) : Maybe<W> {
    return new Nothing();
  }
  alt(other: Maybe<T>) : Maybe<T> { return other; }
  asNullable() : Nullable<T> { return null }
}

function from<T>(v: undefined | T): Maybe<T> {
  if (typeof v === 'undefined') {
    return new Nothing();
  } else {
    return new Just(v);
  }
}

// Remove Nothings from an array.
function catMaybes<T>(xs: Array<Maybe<T>>): Array<T> {
  const r: Array<T> = [];
  for (const x of xs) {
    x.map((v) => r.push(v));
  }
  return r;
}

// Map and filter using maybes
function mapMaybe<T, W>(xs: Array<T>, f: (v: T) => Maybe<W>): Array<W> {
  const r: Array<W> = [];
  for (const x of xs) {
    f(x).map((v) => r.push(v));
  }
  return r;
}

/* eslint-disable no-var */
var CallableJust = Callable(Just) as typeof Just & typeof Just.new;
var CallableNothing = Callable(Nothing) as typeof Nothing & typeof Nothing.new;
