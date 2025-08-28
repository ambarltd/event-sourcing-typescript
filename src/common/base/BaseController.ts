import { Router } from 'express';
import {
  RouteMetadata,
  ROUTE_METADATA_KEY,
} from '../decorators/route/RouteMetadata';
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

        const controllerName = this.constructor.name;
        const requiresAuth =
          controllerName.includes('Reaction') ||
          controllerName.includes('Projection');

        if (requiresAuth) {
          middlewares.push(AmbarAuthMiddleware);
        }

        middlewares.push(handler.bind(this));

        this.router.post(route.path, ...middlewares);
      }
    }
  }
}
