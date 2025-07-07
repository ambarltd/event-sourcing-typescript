import 'reflect-metadata';
import { RouteMetadata, ROUTE_METADATA_KEY } from './RouteMetadata';

function createHttpMethodDecorator(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
) {
  return function (path: string) {
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
  };
}

export const Get = createHttpMethodDecorator('get');
export const Post = createHttpMethodDecorator('post');
export const Put = createHttpMethodDecorator('put');
export const Delete = createHttpMethodDecorator('delete');
export const Patch = createHttpMethodDecorator('patch');
