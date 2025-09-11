export {
  Postgres,
  PostgresTransaction,
  type PoolSettings,
  defaultPoolSettings,
};

import { Pool, PoolConfig, PoolClient, QueryConfig, QueryResult } from 'pg';
import { Future } from '@/lib/Future';

class PostgresTransaction {
  public closed: boolean = false;

  constructor(private connection: PoolClient) {}

  async commit() {
    if (this.closed) {
      throw new Error('Committing a closed transaction');
    }
    try {
      await this.connection.query('COMMIT');
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
      await this.connection.query('ROLLBACK');
    } catch (error) {
      console.error('Failed to rollback PG transaction', error as Error);
    }
    this.closed = true;

    try {
      this.connection.release();
    } catch (error) {
      console.error('Failed to release PG connection', error as Error);
    }
  }

  async query(
    query: string | QueryConfig<string[]>,
    values?: string[] | undefined,
  ): Promise<QueryResult<any>> {
    if (this.closed) {
      throw new Error('Querying a closed connection');
    }

    return this.connection.query(query, values);
  }
}

type PoolSettings = {
  maxConnections: number;
  minConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
};

const defaultPoolSettings: PoolSettings = {
  maxConnections: 10,
  minConnections: 5,
  idleTimeoutMillis: 300000, // 5 minutes
  connectionTimeoutMillis: 20000, // 20 seconds
};

class Postgres {
  private readonly pool: Pool;

  constructor(values: {
    user: string;
    password: string;
    host: string;
    port: number;
    database: string;
    poolSettings: PoolSettings;
  }) {
    const connectionString = `postgresql://${values.user}:${values.password}@${values.host}:${values.port}/${values.database}`;
    const config: PoolConfig = {
      connectionString,
      max: 10,
      min: 5,
      idleTimeoutMillis: 300000, // 5 minutes
      connectionTimeoutMillis: 20000, // 20 seconds
    };
    this.pool = new Pool(config);
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  // Execute an action with a transaction that will be automatically committed at the end.
  async withTransactionP<T>(
    f: (t: PostgresTransaction) => Promise<T>,
  ): Promise<T> {
    const connection = await this.pool.connect();
    const transaction = new PostgresTransaction(connection);
    const result = await f(transaction);
    if (!transaction.closed) await transaction.commit();
    return result;
  }

  // Execute an action with a transaction that will be automatically committed at the end.
  withTransaction<E, T>(
    onConnectionError: (e: Error) => E,
    f: (t: PostgresTransaction) => Future<E, T>,
  ): Future<E, T> {
    return Future.attemptP(() => this.pool.connect())
      .mapRej(onConnectionError)
      .chain((connection) => {
        const transaction = new PostgresTransaction(connection);
        return f(transaction).chain((res) => {
          if (!transaction.closed) {
            Future.attemptP(transaction.commit)
              .mapRej(onConnectionError)
              .map(() => res);
          }
          return Future.resolve(res);
        });
      });
  }
}
