export interface RouteMetadata {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  methodName: string;
}

export const ROUTE_METADATA_KEY = Symbol('route');
