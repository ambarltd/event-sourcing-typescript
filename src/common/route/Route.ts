import 'reflect-metadata';
import { RouteMetadata, ROUTE_METADATA_KEY } from './RouteMetadata';

export function Route(
  path: string,
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' = 'post',
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const existingRoutes: RouteMetadata[] =
      Reflect.getMetadata(ROUTE_METADATA_KEY, target.constructor) || [];

    const routeMetadata: RouteMetadata = {
      path,
      method,
      methodName: propertyName,
    };

    existingRoutes.push(routeMetadata);
    Reflect.defineMetadata(
      ROUTE_METADATA_KEY,
      existingRoutes,
      target.constructor,
    );

    return descriptor;
  };
}
