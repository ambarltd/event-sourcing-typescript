/*
   A Map type that requires a comparison function
*/
export { TreeMap, stringMap };

import BTree from 'sorted-btree';

import { Maybe, Just, Nothing } from '@/lib/Maybe';

const stringMap = <T>(): TreeMap<string, T> =>
  TreeMap.new((x: string, y: string) => (x > y ? 1 : x < y ? -1 : 0));

interface Comparable<T> {
  compare(other: T): number;
}

// This is just a wrapper around BTree which requires
// the comparison function.
class TreeMap<K, V> {
  // @ts-expect-error: unused _. Prevent instantiation by casting.
  private readonly _: null = null;
  tree: BTree<K, V>;
  compare: (l: K, r: K) => number;

  static new<K, V>(compare: (l: K, r: K) => number): TreeMap<K, V> {
    return new TreeMap(compare);
  }

  static new_<K extends Comparable<K>, V>(): TreeMap<K, V> {
    const compare = (x: K, y: K) => x.compare(y);
    return new TreeMap(compare);
  }

  static from<K, V>(
    compare: (l: K, r: K) => number,
    xs: Array<[K, V]>,
  ): TreeMap<K, V> {
    return TreeMap.new<K, V>(compare).setEntries(xs[Symbol.iterator]());
  }

  static from_<K extends Comparable<K>, V>(xs: Array<[K, V]>): TreeMap<K, V> {
    return TreeMap.new_<K, V>().setEntries(xs[Symbol.iterator]());
  }

  private constructor(compare: (l: K, r: K) => number) {
    this.compare = compare;
    this.tree = new BTree([], compare);
  }

  set(k: K, v: V) {
    this.tree.set(k, v);
    return this;
  }

  setWith(k: K, v: V, f: (old: V, _new: V) => V) {
    const found = this.tree.get(k);
    if (found !== undefined) {
      this.tree.set(k, f(found, v));
    } else {
      this.tree.set(k, v);
    }
    return this;
  }

  get(k: K): Maybe<V> {
    const found = this.tree.get(k);
    return found !== undefined ? Just(found) : Nothing();
  }

  has(k: K): boolean {
    return this.tree.has(k);
  }

  remove(k: K): TreeMap<K, V> {
    this.tree.delete(k);
    return this;
  }

  keys(): IterableIterator<K> {
    return this.tree.keys();
  }

  values(): IterableIterator<V> {
    return this.tree.values();
  }

  entries(): IterableIterator<[K, V]> {
    return this.tree.entries();
  }

  setEntries(it: IterableIterator<[K, V]>) {
    for (const [k, v] of it) {
      this.set(k, v);
    }
    return this;
  }

  union(other: TreeMap<K, V>) {
    for (const [k, v] of other.entries()) {
      this.set(k, v);
    }
    return this;
  }

  unionWith(other: TreeMap<K, V>, f: (old: V, new_: V) => V) {
    for (const [k, v] of other.entries()) {
      this.setWith(k, v, f);
    }
    return this;
  }

  // Create a new TreeMap from keys common to two other maps.
  intersectionWith<W, X>(
    other: TreeMap<K, W>,
    f: (left: V, right: W) => X,
  ): TreeMap<K, X> {
    const result = new TreeMap<K, X>(this.compare);
    for (const [k, v] of this.entries()) {
      const found = other.get(k);
      if (found instanceof Just) {
        result.set(k, f(v, found.value));
      }
    }
    return result;
  }

  // Difference in the set of keys
  // A.difference(B) equals A minus all keys present in B.
  difference(other: TreeMap<K, unknown>): TreeMap<K, V> {
    const diff = new TreeMap<K, V>(this.compare);
    for (const [k, v] of this.entries()) {
      if (!other.has(k)) {
        diff.set(k, v);
      }
    }
    return diff;
  }

  mapWithKeys<W>(f: (k: K, v: V) => W): TreeMap<K, W> {
    const n = new TreeMap<K, W>(this.compare);
    for (const [k, v] of this.entries()) {
      n.set(k, f(k, v));
    }
    return n;
  }

  map<W>(f: (v: V) => W): TreeMap<K, W> {
    return this.mapWithKeys((_, v) => f(v));
  }

  size(): number {
    return this.tree.size;
  }
}
