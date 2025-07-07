import { PostgresTransactionalEventStore } from '../eventStore/PostgresTransactionalEventStore';
import { MongoTransactionalProjectionOperator } from '../projection/MongoTransactionalProjectionOperator';
import { log } from '../util/Logger';
import { Command } from './Command';
import { CommandHandler } from './CommandHandler';
import { Router } from 'express';
import { RouteMetadata, ROUTE_METADATA_KEY } from '../route/RouteMetadata';
import 'reflect-metadata';

export class CommandController {
  public readonly router: Router;

  constructor(
    private readonly postgresTransactionalEventStore: PostgresTransactionalEventStore,
    private readonly mongoTransactionalProjectionOperator: MongoTransactionalProjectionOperator,
  ) {
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    const routes: RouteMetadata[] =
      Reflect.getMetadata(ROUTE_METADATA_KEY, this.constructor) || [];

    for (const route of routes) {
      const handler = (this as any)[route.methodName];
      if (handler && typeof handler === 'function') {
        this.router[route.method](route.path, handler.bind(this));
      }
    }
  }

  protected async processCommand(
    command: Command,
    commandHandler: CommandHandler,
  ): Promise<void> {
    try {
      log.debug(`Starting to process command: ${command.constructor.name}`);
      await this.postgresTransactionalEventStore.beginTransaction();
      await this.mongoTransactionalProjectionOperator.startTransaction();
      await commandHandler.handleCommand(command);
      await this.postgresTransactionalEventStore.commitTransaction();
      await this.mongoTransactionalProjectionOperator.commitTransaction();

      await this.postgresTransactionalEventStore.abortDanglingTransactionsAndReturnConnectionToPool();
      await this.mongoTransactionalProjectionOperator.abortDanglingTransactionsAndReturnSessionToPool();
      log.debug(`Successfully processed command: ${command.constructor.name}`);
    } catch (error) {
      await this.postgresTransactionalEventStore.abortDanglingTransactionsAndReturnConnectionToPool();
      await this.mongoTransactionalProjectionOperator.abortDanglingTransactionsAndReturnSessionToPool();
      log.error(`Exception in ProcessCommand: ${error}`, error as Error);
      throw new Error(`Failed to process query: ${error}`);
    }
  }
}
