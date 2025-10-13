export { controller };

import * as d from '@/lib/json/decoder';
import { QueryHandler, QueryController } from '@/app/queryHandler';
import { Future } from '@/lib/Future';
import { internalServerError } from '@/app/responses';
import { RepoCuisine } from '@/domain/cookingClub/membership2/projection/membersByCuisine';
import * as router from '@/lib/router';

type Query = d.Infer<typeof decoder>;

const decoder = d.object({});

const handler: QueryHandler<Query> = ({
  projections,
}): Future<router.Response, router.Response> =>
  Future.attemptP<router.Response>(async () => {
    const repoCuisine = projections[RepoCuisine.collectionName];
    const cuisines = await repoCuisine.findAll();
    return router.json({ content: cuisines });
  }).mapRej((_) => internalServerError);

const controller: QueryController<Query> = { decoder, handler };
