export {
  type Repository, // export only type here to prevent instantiation outside of module.
  MongoProjectionStore,
  Collection as Collection,
  type JsonDoc,
  type RepositoryArgs,
  type WithProjectionStore,
  Mode,
};

import { Collection } from 'mongodb';
import { Json } from '@/lib/json/types';
import { Schema } from '@/lib/json/schema';
import * as s from '@/lib/json/schema';
import { MongoTransaction } from '@/lib/mongo';
import {
  Filter,
  FindOptions,
  Document,
  InsertOneOptions,
  WithId,
} from 'mongodb';
import { Success, Failure } from '@/lib/Result';
import { Future } from '@/lib/Future';

type JsonDoc = Exclude<null, Json>;

type RepositoryArgs<T> = {
  collectionName: string;
  createIndexes: (collection: Collection<never>) => Promise<void>;
  schema: Schema<T>;
  toId: (v: T) => string;
};

// Represents an initialized collection. You can only get an
// instance of this class if the collection has been initialized.
class Repository<T> {
  constructor(public values: RepositoryArgs<T>) {}
}

type IdAndDoc<T> = { _id: string; document: T };

const schemaIdAndValue = <T>(schema: Schema<T>): Schema<IdAndDoc<T>> => {
  const idSchema = s.object({ _id: s.string }).dimap(
    ({ _id }) => _id,
    (_id) => ({ _id }),
  );

  return s.both(idSchema, schema).dimap(
    ([_id, document]) => ({ _id, document }),
    ({ _id, document }) => [_id, document],
  );
};

type WithProjectionStore = <E, T>(
  onError: (e: Error) => E,
  mode: Mode,
  f: (s: MongoProjectionStore) => Future<E, T>,
) => Future<E, T>;

enum Mode {
  ReadOnly = 'ReadOnly',
  ReadWrite = 'ReadWrite',
}

class MongoProjectionStore {
  constructor(
    private transaction: MongoTransaction,
    private readonly readOnly: Mode,
  ) {}

  // Initialize a repository, creating the collection and indexes if needed.
  async createRepository<T>(args: RepositoryArgs<T>): Promise<Repository<T>> {
    console.log(`Initializing '${args.collectionName}'`);

    const db = this.transaction.database;
    const collections = await db.listCollections().toArray();
    const names = collections.map((c) => c.name);

    if (names.includes(args.collectionName)) {
      console.log(`Collection '${args.collectionName}' already exists`);
    } else {
      await db.createCollection(args.collectionName);
    }

    const collection = db.collection<JsonDoc>(args.collectionName);
    await args.createIndexes(collection);
    console.log(`Indexes for '${args.collectionName}' created`);

    return new Repository(args);
  }

  async findAny<T extends Document>(
    repository: Repository<any>,
    filter: Filter<T>,
    options?: FindOptions,
  ): Promise<WithId<T>[]> {
    return this.transaction.find(
      repository.values.collectionName,
      filter,
      options,
    );
  }

  async find<T>(
    repository: Repository<T>,
    filter: Filter<JsonDoc>,
    options?: FindOptions,
  ): Promise<T[]> {
    const found = (await this.transaction.find(
      repository.values.collectionName,
      filter,
      options,
    )) as JsonDoc[];
    const schema = s.array(repository.values.schema);
    const r = s.decode(schema, found);
    switch (true) {
      case r instanceof Success:
        return r.value;
      case r instanceof Failure:
        throw new Error(
          `Unable to decode: ${r.error}.\nIn ${JSON.stringify(found)}`,
        );
      default:
        return r satisfies never;
    }
  }

  // fails on _id clashes.
  async insert<T>(
    repository: Repository<T>,
    document: T,
    options?: InsertOneOptions,
  ): Promise<void> {
    if (this.readOnly == Mode.ReadOnly) {
      throw new Error('Trying to write to read-only projection store');
    }
    const schema = schemaIdAndValue(repository.values.schema);
    const _id = repository.values.toId(document);
    await this.transaction.insertOne(
      repository.values.collectionName,
      s.encode(schema, { _id, document }) as JsonDoc,
      options,
    );
  }

  // Upsert one value. Overwrites on _id clashes
  async upsert<T>(
    repository: Repository<T>,
    document: T,
    options: InsertOneOptions = {},
  ): Promise<void> {
    if (this.readOnly == Mode.ReadOnly) {
      throw new Error('Trying to write to read-only projection store');
    }
    const schema = schemaIdAndValue(repository.values.schema);
    const _id = repository.values.toId(document);
    await this.transaction.replaceOne(
      repository.values.collectionName,
      { _id },
      s.encode(schema, { _id, document }) as JsonDoc,
      Object.assign({ upsert: true }, options),
    );
  }
}
