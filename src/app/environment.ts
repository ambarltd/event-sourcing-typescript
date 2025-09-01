// Environment variables
//
// All environment variables used by the program are here.
// All of them are required at the beginning of the program and
// if any is missing a suitable error is thrown with a description
// of the expected values of the variable.

import * as D from '@/lib/json/decoder';

type Environment = D.Infer<typeof envDecoder>;

// All expected environment variables are checked at program initialization.
const envDecoder = D.object({});

const environment: Environment = D.decode(process.env, envDecoder).unwrap(err => {
  throw new Error(`Unable to parse environment variables:\n${err}`);
});

export default environment;
