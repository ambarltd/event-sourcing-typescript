// An immutable linked list.
//
// Care must be taken when adding new methods to ensure all of them
// are stack safe. Use Trampoline if needed.
export { List };

import { Maybe, Just, Nothing } from '@/lib/Maybe';

type Content<T> = { head: T; tail: List<T> } | { empty: null };

class List<T> {
  readonly value: Content<T>;

  static empty<T>(): List<T> {
    return new List({ empty: null });
  }
  static cons<T>(head: T, tail: List<T>): List<T> {
    return new List({ head, tail });
  }
  static singleton<T>(v: T): List<T> {
    return List.cons(v, List.empty());
  }
  static concat<T>(x: List<T>, y: List<T>): List<T> {
    let r = y;
    for (const el of x.reverse()) {
      r = List.cons(el, r);
    }
    return r;
  }
  static from<T>(array: Array<T>): List<T> {
    let result: List<T> = List.empty();
    for (const item of array.reverse()) {
      result = List.cons(item, result);
    }
    return result;
  }
  private constructor(v: Content<T>) {
    this.value = v;
  }

  isEmpty(): boolean {
    switch (true) {
      case 'empty' in this.value:
        return true;
      case 'head' in this.value:
        return false;
      default:
        return this.value satisfies never;
    }
  }

  head(): Maybe<T> {
    switch (true) {
      case 'empty' in this.value:
        return Nothing();
      case 'head' in this.value:
        return Just(this.value.head);
      default:
        return this.value satisfies never;
    }
  }

  tail(): List<T> {
    switch (true) {
      case 'empty' in this.value:
        return List.empty();
      case 'head' in this.value:
        return this.value.tail;
      default:
        return this.value satisfies never;
    }
  }

  length(): number {
    let len = 0;
    let node = this.value;
    while (!('empty' in node)) {
      len++;
      node = node.tail.value;
    }
    return len;
  }

  map<W>(f: (v: T) => W): List<W> {
    let r: List<W> = List.empty();
    for (const item of this.reverse()) {
      r = List.cons(f(item), r);
    }
    return r;
  }

  reverse(): List<T> {
    let r: List<T> = List.empty();
    for (const item of this) {
      r = List.cons(item, r);
    }
    return r;
  }

  toArray(): Array<T> {
    const result: Array<T> = [];
    for (const item of this) {
      result.push(item);
    }
    return result;
  }

  *[Symbol.iterator](): IterableIterator<T> {
    let list: List<T> = this;
    while (!list.isEmpty()) {
      const head = list.head();
      switch (true) {
        case head instanceof Just:
          yield head.value;
          break;
        case head instanceof Nothing:
          break;
        default:
          head satisfies never;
      }
      list = list.tail();
    }
  }
}
