import { Router } from 'express';
import {
  RouteMetadata,
  ROUTE_METADATA_KEY,
} from '../decorators/route/RouteMetadata';
import { AuthenticationMiddleware } from '../middleware/AuthenticationMiddleware';
import { AmbarAuthMiddleware } from '../ambar/AmbarAuthMiddleware';
import 'reflect-metadata';

export abstract class BaseController {
  public readonly router: Router;

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    const routes: RouteMetadata[] =
      Reflect.getMetadata(ROUTE_METADATA_KEY, this.constructor) || [];

    for (const route of routes) {
      const handler = (this as any)[route.methodName];
      if (handler && typeof handler === 'function') {
        const middlewares = [];

        const isAnonymousAllowed = AuthenticationMiddleware.isAnonymousAllowed(
          this.constructor,
          route.methodName,
        );

        if (!isAnonymousAllowed) {
          middlewares.push(AmbarAuthMiddleware);
        }

        middlewares.push(handler.bind(this));

        this.router[route.method](route.path, ...middlewares);
      }
    }
  }
}
