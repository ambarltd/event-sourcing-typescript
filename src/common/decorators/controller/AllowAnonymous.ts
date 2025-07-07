import 'reflect-metadata';

export const ALLOW_ANONYMOUS_METADATA_KEY = Symbol('allowAnonymous');

export function AllowAnonymous(
  target: any,
  propertyKey?: string,
  descriptor?: PropertyDescriptor,
) {
  if (propertyKey) {
    Reflect.defineMetadata(
      ALLOW_ANONYMOUS_METADATA_KEY,
      true,
      target,
      propertyKey,
    );
  } else {
    Reflect.defineMetadata(ALLOW_ANONYMOUS_METADATA_KEY, true, target);
  }

  return descriptor || target;
}
