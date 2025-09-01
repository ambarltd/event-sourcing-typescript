/*
Result<E, T> is a type which represents the success or failure of an action.

Values can be extracted using `instsanceof` tests.

    switch (true) {
        case x instanceof Success:
            // use x.value here
            break;
        case x instanceof Failure:
            // use x.error here
            break;
        default:
            x satisfies never;
   }
*/
export {
  type Result,
  CallableSuccess as Success,
  CallableFailure as Failure,
  traverse,
  traverse_,
};

import Callable from '@/lib/Callable';
import { Trampoline, end, tailRecursive } from '@/lib/Trampoline';
import { List } from '@/lib/List';

type Result<E, T> = Success<E, T> | Failure<E, T>;

export interface IResult<E, T> {
  isSuccess(): boolean;
  isFailure(): boolean;
  map<W>(f: (t: T) => W): Result<E, W>;
  mapFailure<W>(f: (t: E) => W): Result<W, T>;
  either<W>(f: (e: E) => W, g: (s: T) => W): W;
  then<W>(f: (t: T) => Result<E, W>): Result<E, W>;
  unwrap(f: (e: E) => string): T;
  withDefault(f: (e: E) => T): T;
}

class Success<E, T> implements IResult<E, T> {
  readonly value: T;

  static new<E, T>(v: T): Success<E, T> {
    return new Success(v);
  }
  constructor(v: T) {
    this.value = v;
  }

  isSuccess() {
    return true;
  }
  isFailure() {
    return false;
  }
  map<W>(f: (t: T) => W): Result<E, W> {
    return new Success(f(this.value));
  }
  mapFailure<W>(_: (t: E) => W): Result<W, T> {
    return new Success(this.value);
  }
  either<W>(_: (e: E) => W, g: (s: T) => W): W {
    return g(this.value);
  }
  then<W>(f: (t: T) => Result<E, W>): Result<E, W> {
    return f(this.value);
  }
  unwrap(_: (e: E) => string): T {
    return this.value;
  }
  withDefault(_: (e: E) => T) {
    return this.value;
  }
}

class Failure<E, T> implements IResult<E, T> {
  readonly error: E;

  static new<E, T>(v: E): Failure<E, T> {
    return new Failure(v);
  }
  constructor(v: E) {
    this.error = v;
  }

  isSuccess() {
    return false;
  }
  isFailure() {
    return true;
  }
  map<W>(_: (t: T) => W): Result<E, W> {
    return new Failure(this.error);
  }
  mapFailure<W>(f: (t: E) => W): Result<W, T> {
    return new Failure(f(this.error));
  }
  either<W>(f: (e: E) => W, _: (s: T) => W): W {
    return f(this.error);
  }
  then<W>(_: (t: T) => Result<E, W>): Result<E, W> {
    return new Failure(this.error);
  }
  unwrap(f: (error: E) => string): T {
    throw new Error(f(this.error));
  }
  withDefault(f: (e: E) => T) {
    return f(this.error);
  }
}

function traverse<T, A, E>(
  xs: List<A>,
  f: (v: A) => Result<E, T>,
): Result<E, List<T>> {
  const go: (done: List<T>, todo: List<A>) => Trampoline<Result<E, List<T>>> =
    tailRecursive((done, todo) => {
      switch (true) {
        case 'head' in todo.value: {
          const { head, tail } = todo.value;
          const r = f(head);
          switch (true) {
            case r instanceof Success: {
              const value = r.value;
              return go(List.cons(value, done), tail);
            }
            case r instanceof Failure:
              return end(new Failure(r.error));
            default:
              return r satisfies never;
          }
        }
        case 'empty' in todo.value:
          return end(new Success(done));
        default:
          return todo.value satisfies never;
      }
    });

  return go(List.empty(), xs).run();
}

function traverse_<T, A, E>(
  xs: Array<A>,
  f: (v: A) => Result<E, T>,
): Result<E, Array<T>> {
  return traverse(List.from(xs), f).map((r) => r.toArray());
}

/* eslint-disable no-var */
var CallableSuccess = Callable(Success) as typeof Success & typeof Success.new;
var CallableFailure = Callable(Failure) as typeof Failure & typeof Failure.new;
