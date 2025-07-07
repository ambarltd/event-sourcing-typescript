import { Router } from 'express';
import {
  RouteMetadata,
  ROUTE_METADATA_KEY,
} from '../decorators/route/RouteMetadata';
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
        this.router[route.method](route.path, handler.bind(this));
      }
    }
  }
}
