/**
 * @description
 * An utility class to prevent null/undefined values, empty objects/arrays
 * & incorrect input length.
 */
export class Guard {
  /**
   * @description
   * Checks if value is empty.
   * Accepts strings, numbers, booleans, objects & arrays.
   */
  static isEmpty(value: unknown): boolean {
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value instanceof Date
    ) {
      return false;
    }

    if (typeof value === 'undefined' || value === null || value === '') {
      return true;
    }

    if (value instanceof Object && !Object.keys(value).length) {
      return true;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return true;
      }

      if (value.every((item) => Guard.isEmpty(item))) {
        return true;
      }
    }

    return false;
  }
}
