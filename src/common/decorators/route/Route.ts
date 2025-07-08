import 'reflect-metadata';
import { RouteMetadata, ROUTE_METADATA_KEY } from './RouteMetadata';

export function Route(path: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const existingRoutes: RouteMetadata[] =
      Reflect.getMetadata(ROUTE_METADATA_KEY, target.constructor) || [];

    const routeMetadata: RouteMetadata = {
      method: 'POST',
      path,
      methodName: propertyKey,
    };

    existingRoutes.push(routeMetadata);
    Reflect.defineMetadata(
      ROUTE_METADATA_KEY,
      existingRoutes,
      target.constructor,
    );
  };
}
