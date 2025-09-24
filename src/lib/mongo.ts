export { Mongo, MongoTransaction };

import {
  ClientSession,
  Filter,
  FindOptions,
  Document,
  ReplaceOptions,
  InsertOneOptions,
  CountOptions,
  Db,
  ReadConcern,
  WriteConcern,
  ReadPreference,
  TransactionOptions,
  OptionalUnlessRequiredId,
  WithId,
  MongoClientOptions,
  MongoClient,
} from 'mongodb';
import { Future } from '@/lib/Future';

class MongoTransaction {
  public closed: boolean = false;
  constructor(
    public readonly session: ClientSession,
    public readonly database: Db,
  ) {}

  async commit() {
    if (this.closed) {
      throw new Error('Committing a closed transaction');
    }

    try {
      await this.session.commitTransaction();
      this.closed = true;
    } catch (error) {
      this.closed = true;
      throw new Error(`Failed to commit transaction: ${error}`);
    }
  }

  async abort() {
    if (this.closed) {
      throw new Error('Aborting a closed transaction');
    }

    try {
      await this.session.abortTransaction();
    } catch (error) {
      console.error('Failed to abort MongoDB transaction', error as Error);
    }
    this.closed = true;
  }

  async find<T extends Document>(
    collectionName: string,
    filter: Filter<T>,
    options?: FindOptions,
  ): Promise<WithId<T>[]> {
    this.checkOpen();
    return this.database
      .collection<T>(collectionName)
      .find(filter, { ...options, session: this.session })
      .toArray();
  }

  async replaceOne<T extends Document>(
    collectionName: string,
    filter: Filter<T>,
    replacement: T,
    options?: ReplaceOptions,
  ): Promise<Document> {
    this.checkOpen();
    return this.database
      .collection<T>(collectionName)
      .replaceOne(filter, replacement, {
        ...options,
        session: this.session,
      });
  }

  async insertOne<T extends Document>(
    collectionName: string,
    document: T & OptionalUnlessRequiredId<T>,
    options?: InsertOneOptions,
  ): Promise<void> {
    this.checkOpen();
    await this.database
      .collection<T>(collectionName)
      .insertOne(document, { ...options, session: this.session });
  }

  async countDocuments<T extends Document>(
    collectionName: string,
    filter: Filter<T>,
    options?: CountOptions,
  ): Promise<number> {
    this.checkOpen();
    return this.database
      .collection<T>(collectionName)
      .countDocuments(filter, { ...options, session: this.session });
  }

  private checkOpen() {
    if (this.closed) {
      throw new Error('Session must be active to read or write to MongoDB!');
    }
  }
}

const transactionOptions: TransactionOptions = {
  readConcern: new ReadConcern('snapshot'),
  writeConcern: new WriteConcern('majority'),
  readPreference: ReadPreference.primary,
};

class Mongo {
  client: MongoClient;

  constructor(
    public values: {
      username: string;
      password: string;
      host: string;
      port: number;
      database: string;
      settings: MongoClientOptions;
    },
  ) {
    const connectionString =
      `mongodb://${values.username}:${values.password}@${values.host}` +
      `:${values.port.toString()}/${values.database}` +
      '?serverSelectionTimeoutMS=10000&connectTimeoutMS=10000&authSource=admin';
    this.client = new MongoClient(connectionString, values.settings);
  }

  // Execute an action with a transaction that will be automatically committed at the end.
  withTransaction<E, T>(
    f: (t: MongoTransaction) => Future<E, T>,
  ): Future<E, T> {
    const session = this.client.startSession();

    session.startTransaction(transactionOptions);
    const database = this.client.db(this.values.database);
    const transaction = new MongoTransaction(session, database);
    return f(transaction).finally(
      Future.create((_, res) => {
        if (!transaction.closed) transaction.abort();
        session.endSession();
        return res();
      }),
    );
  }
}
