// Lazy promises.
//
// This is a wrapper on top of the fluture library to provide a sensible
// and uncurried interface.

export { Future };

import { FutureInstance } from 'fluture';
import * as F from 'fluture';

type Cancel = void | (() => void);

// An object where each key is a future.
type Fut<E, C> = { [K in keyof C]: Future<E, C[K]> };

class Future<E, T> {
  readonly inner: FutureInstance<E, T>;

  static create<E, T>(
    f: (r: F.RejectFunction<E>, a: F.ResolveFunction<T>) => Cancel,
  ): Future<E, T> {
    return new Future(
      F.Future((r, a) => {
        const cancel = f(r, a);
        return cancel === undefined ? () => {} : cancel;
      }),
    );
  }

  static resolve<E, T>(x: T): Future<E, T> {
    return new Future(F.resolve(x));
  }

  static reject<E, T>(x: E): Future<E, T> {
    return new Future(F.reject(x));
  }

  // Convert a promise-returning function into a Future.
  static attemptP<T>(f: () => Promise<T>): Future<Error, T> {
    return new Future(F.attemptP(f));
  }

  // Perform safe resource handling.
  static bracket<E, A, B, C>(
    acquire: Future<E, A>,
    release: (_: A) => Future<E, C>,
    consume: (_: A) => Future<E, B>,
  ) {
    return new Future(
      F.hook(acquire.inner)((x) => release(x).inner)((x) => consume(x).inner),
    );
  }

  static parallel<E, T>(
    n: number,
    xs: Array<Future<E, T>>,
  ): Future<E, Array<T>> {
    return new Future(F.parallel(n)(xs.map((f) => f.inner)));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static concurrently<E, C extends { [k: string]: any }>(
    obj: Fut<E, C>,
  ): Future<E, C> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const futures: Future<E, any>[] = [];

    Object.keys(obj).forEach(<K extends string & keyof C>(key: K) => {
      const fut = obj[key] as Future<E, C[K]>;
      futures.push(fut.map((value) => ({ [key]: value })));
    });

    return Future.parallel(Infinity, futures).map((results) =>
      results.reduce((acc, x) => Object.assign(acc, x)),
    );
  }

  // map all actions in parallel.
  static mapConcurrently<A, E, T>(
    f: (_: A) => Future<E, T>,
    xs: Array<A>,
  ): Future<E, Array<T>> {
    return Future.parallel(Infinity, xs.map(f));
  }

  static both<E, A, B>(x: Future<E, A>, y: Future<E, B>): Future<E, [A, B]> {
    return new Future(F.both(x.inner)(y.inner));
  }

  static traverse<A, E, T>(
    f: (_: A) => Future<E, T>,
    xs: Array<A>,
  ): Future<E, Array<T>> {
    return xs.reduce(
      (acc, x) =>
        acc.chain((ys) =>
          f(x).map((y) => {
            ys.push(y);
            return ys;
          }),
        ),
      Future.resolve([]) as Future<E, Array<T>>,
    );
  }

  constructor(inner: FutureInstance<E, T>) {
    this.inner = inner;
  }

  map<W>(f: (_: T) => W): Future<E, W> {
    return new Future(F.map(f)(this.inner));
  }

  mapRej<W>(f: (_: E) => W): Future<W, T> {
    return new Future(F.mapRej(f)(this.inner));
  }

  bimap<F, W>(f: (_: E) => F, g: (_: T) => W): Future<F, W> {
    return this.map(g).mapRej(f);
  }

  chain<W>(f: (_: T) => Future<E, W>): Future<E, W> {
    const g = (x: T): FutureInstance<E, W> => f(x).inner;
    return new Future(F.chain(g)(this.inner));
  }

  chainRej<F>(f: (_: E) => Future<F, T>): Future<F, T> {
    const g = (x: E): FutureInstance<F, T> => f(x).inner;
    return new Future(F.chainRej(g)(this.inner));
  }

  bichain<F, W>(
    f: (_: E) => Future<F, W>,
    g: (_: T) => Future<F, W>,
  ): Future<F, W> {
    const h = (x: E): FutureInstance<F, W> => f(x).inner;
    const i = (x: T): FutureInstance<F, W> => g(x).inner;
    return new Future(F.bichain(h)(i)(this.inner));
  }

  // run this computation after a future has completed,
  // whether successfully or not.
  finally(act: Future<E, void>): Future<E, T> {
    return new Future(F.lastly(act.inner)(this.inner));
  }

  // run the computation
  fork(f: (_: E) => void, g: (_: T) => void): Cancel {
    return F.fork(f)(g)(this.inner);
  }

  promise(f: (_: E) => Error): Promise<T> {
    return F.promise(this.mapRej(f).inner);
  }
}
