export { tests };

import { test, group, expect } from '/tests/unit/lib/test';

const tests = group('Example test group', [
  group('subgroup', [
    test('should work', async () => {
      const list = [1, 2, 3];
      return expect.equals(list.reverse(), list.reverse().reverse());
    }),
  ]),
]);
