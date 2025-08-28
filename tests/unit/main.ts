import 'tsconfig-paths/register'; // enable absolute paths

import { run } from '/tests/unit/lib/test';

import * as example from '/tests/unit/suites/example';

console.log('Running tests');
run([example.tests]);
