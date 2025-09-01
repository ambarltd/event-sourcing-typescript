/* A way to get around the lack of tail-call optimisations.
 *
 * This overflows the stack:
 *
 *    const count = (x: number) : number =>
 *      x < 2
 *        ? x
 *        : (x + count(x - 1));
 *
 *
 * This doesn't
 *
 *   const count = fix<[number, number], number>((go, end) => (acc, n) =>
 *       (n < 2)
 *        ? end(acc + n)
 *        : go(acc + n, n - 1)
 *   );
 *
 * This is just another way to write it.
 *
 *   const count : ((acc:number, n:number) => Trampoline<number>) = tailRecursive((acc, n) =>
 *       (n < 2)
 *        ? end(acc + n)
 *        : count(acc + n, n - 1)
 *   );
 *
 *  Can be tested with count(30000);
 */

export { type Trampoline, tailRecursive, end, fix };

type Trampoline<A> = End<A> | Rec<A>;

function run<A>(tramp: Trampoline<A>): A {
  let result: Trampoline<A> = tramp;
  while (result instanceof Rec) {
    result = result.fun();
  }

  return result.value;
}

const rec = <A>(f: () => Trampoline<A>): Trampoline<A> => new Rec(f);
const end = <A>(v: A): Trampoline<A> => new End(v);

// Result of a computation
class End<A> {
  value: A;
  constructor(v: A) {
    this.value = v;
  }
  run(): A {
    return run(this);
  }
  map<B>(f: (v: A) => B): Trampoline<B> {
    return end(f(this.value));
  }
}

// A tail call
class Rec<A> {
  fun: () => Trampoline<A>;
  constructor(f: () => Trampoline<A>) {
    this.fun = f;
  }
  run(): A {
    return run(this);
  }
  map<B>(f: (v: A) => B): Trampoline<B> {
    const v = this.fun();
    return rec(() => v.map(f));
  }
}

type Fun<A extends unknown[], B> = (...args: A) => B;

// The Y combinator. Get a function's fixpoint.
function fix<A extends unknown[], R>(
  f: Fun<
    [Fun<A, Trampoline<R>>, (r: R) => Trampoline<R>],
    Fun<A, Trampoline<R>>
  >,
): Fun<A, R> {
  let lazy_f: Fun<A, Trampoline<R>> = (..._: A) => {
    throw new Error('recursion error');
  };
  const recurse: Fun<A, Trampoline<R>> = (...args: A) =>
    rec(() => lazy_f(...args));
  lazy_f = f(recurse, end);
  return (...args: A) => lazy_f(...args).run();
}

function tailRecursive<A extends unknown[], R>(
  f: Fun<A, Trampoline<R>>,
): Fun<A, Trampoline<R>> {
  return (...args: A) => rec(() => f(...args));
}
