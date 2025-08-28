import { run } from './lib/test';

import * as example from './suites/example';

console.log('Running tests');
run([example.tests]);
