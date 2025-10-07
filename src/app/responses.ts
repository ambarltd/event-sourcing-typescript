export { internalServerError, forbidden, unauthorized, badRequest };

import { json } from '@/lib/router';
import { Json } from '@/lib/json/types';

const internalServerError = json({
  status: 500,
  content: { error: { message: 'Internal Server Error' } },
});

const forbidden = json({
  status: 403,
  content: { error: { message: 'Forbidden' } },
});

const unauthorized = json({
  status: 401,
  content: { error: { message: 'Unauthorized' } },
});

const badRequest = (details: Json) =>
  json({
    status: 400,
    content: { error: { message: 'Bad Request', details } },
  });
