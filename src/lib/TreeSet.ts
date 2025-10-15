/*
  A Set type that requires a comparison function
*/
export { TreeSet };

import BTree from 'sorted-btree';

interface Comparable<T> {
  compare(other: T): number;
}

// This is just a wrapper around BTree which requires
// the comparison function.
class TreeSet<K> {
  // @ts-expect-error: unused _. Prevent instantiation by casting.
  private readonly _: null = null;
  tree: BTree<K, null>;
  compare: (l: K, r: K) => number;

  static new<K>(compare: (l: K, r: K) => number): TreeSet<K> {
    return new TreeSet(compare);
  }

  static new_<K extends Comparable<K>>(): TreeSet<K> {
    const compare = (x: K, y: K) => x.compare(y);
    return new TreeSet(compare);
  }

  // Return a clone of the tree.
  static from<K>(tree: TreeSet<K>): TreeSet<K> {
    const created = TreeSet.new(tree.compare);
    created.tree = tree.tree.clone();
    return created;
  }

  static from_<K extends Comparable<K>>(xs: Array<K>): TreeSet<K> {
    return TreeSet.new_<K>().insertValues(xs);
  }

  private constructor(compare: (l: K, r: K) => number) {
    this.compare = compare;
    this.tree = new BTree([], compare);
  }

  insert(k: K): TreeSet<K> {
    this.tree.set(k, null);
    return this;
  }

  has(k: K): boolean {
    return this.tree.has(k);
  }

  remove(k: K): TreeSet<K> {
    this.tree.delete(k);
    return this;
  }

  values(): Array<K> {
    return Array.from(this.tree.keys());
  }

  insertValues(it: Array<K>) {
    for (const k of it) {
      this.insert(k);
    }
    return this;
  }

  union(other: TreeSet<K>) {
    this.insertValues(other.values());
    return this;
  }

  size(): number {
    return this.tree.size;
  }
}
