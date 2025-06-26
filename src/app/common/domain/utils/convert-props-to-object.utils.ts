/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types */

import { Entity, ValueObject } from '../base';

function isEntity(obj: unknown): obj is Entity<unknown, unknown> {
  /**
   * 'instanceof Entity' causes error here for some reason.
   * Probably creates some circular dependency. This is a workaround
   * until I find a solution :)
   */
  if ((obj as Entity<unknown, unknown>)?.toObject) {
    return true;
  }
}

function convertToPlainObject(item: any): any {
  if (ValueObject.isValueObject(item)) {
    return item.unpack();
  }

  if (isEntity(item)) {
    return item.toObject();
  }

  return item;
}

function convertToPlainFlatObject(item: any): any {
  if (ValueObject.isValueObject(item)) {
    return item.unpack();
  }

  if (isEntity(item)) {
    return item.toFlatObject();
  }

  return item;
}

/**
 * Converts Entity/Value Objects props to a plain object.
 * Useful for testing and debugging.
 * @param props
 */
export function convertPropsToObject(props: any): any {
  if (Array.isArray(props)) {
    return props.map((item) => convertToPlainObject(item));
  }

  const propsCopy = Object.assign({}, props);

  // eslint-disable-next-line guard-for-in
  for (const prop in propsCopy) {
    if (Array.isArray(propsCopy[prop])) {
      propsCopy[prop] = (propsCopy[prop] as Array<unknown>).map((item) => {
        return convertToPlainObject(item);
      });
    }
    propsCopy[prop] = convertToPlainObject(propsCopy[prop]);
  }

  return propsCopy;
}
export function convertPropsToFlatObject(props: any): any {
  const propsCopy = Object.assign({}, props);

  // eslint-disable-next-line guard-for-in
  for (const prop in propsCopy) {
    if (Array.isArray(propsCopy[prop])) {
      propsCopy[prop] = (propsCopy[prop] as Array<unknown>).map((item) => {
        return convertToPlainFlatObject(item);
      });
    }
    propsCopy[prop] = convertToPlainFlatObject(propsCopy[prop]);
  }

  return propsCopy;
}
