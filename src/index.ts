import 'tsconfig-paths/register'; // enable absolute paths
import 'reflect-metadata';
import express from 'express';
import { configureDependencies } from '@/app/integrations';
import { log } from '@/common/util/Logger';
import { handleCommand, CommandController } from '@/app/handleCommand';
import { Event } from '@/lib/eventSourcing/event';
import {
  handleReaction,
  wrapWithEventStore,
  ReactionController,
} from '@/app/handleReaction';
import { handleProjection, ProjectionController } from '@/app/handleProjection';
import { handleQuery, QueryController } from '@/app/handleQuery';
import * as membership_command_submitApplication from '@/domain/cookingClub/membership/command/submitApplication';
import * as membership_reaction_evaluateApplication from '@/domain/cookingClub/membership/reaction/evaluateApplication';
import * as membership_projection_membersByCuisine from '@/domain/cookingClub/membership/projection/membersByCuisine';
import * as membership_query_membersByCuisine from '@/domain/cookingClub/membership/query/membersByCuisine';

async function main() {
  // Configure dependency injection
  const { withEventStore, withProjectionStore, services, repositories } =
    await configureDependencies();

  // Create express app
  const app = express();
  app.use(express.json());

  const command = <T>(endpoint: string, controller: CommandController<T>) =>
    app.post(
      endpoint,
      handleCommand(
        withEventStore,
        withProjectionStore,
        services,
        repositories,
        controller,
      ),
    );

  const reaction = <T extends Event<any>>(
    endpoint: string,
    controller: ReactionController<T>,
  ) =>
    app.post(
      endpoint,
      handleReaction(
        wrapWithEventStore(withEventStore),
        withProjectionStore,
        services,
        repositories,
        controller,
      ),
    );

  const projection = <T extends Event<any>>(
    endpoint: string,
    controller: ProjectionController<T>,
  ) =>
    app.post(
      endpoint,
      handleProjection(withProjectionStore, repositories, controller),
    );

  const query = <Query>(endpoint: string, controller: QueryController<Query>) =>
    app.get(
      endpoint,
      handleQuery(withProjectionStore, repositories, controller),
    );

  //////////////////////////////////////////////////////////////////////

  command(
    '/api/v1/cooking-club/membership/command/submit-application',
    membership_command_submitApplication.controller,
  );

  reaction(
    '/api/v1/cooking-club/membership/reaction/evaluateApplication',
    membership_reaction_evaluateApplication.controller,
  );

  projection(
    '/api/v1/cooking-club/membership/projection/membersByCuisine',
    membership_projection_membersByCuisine.controller,
  );

  query(
    '/api/v1/cooking-club/membership/projection/membersByCuisine',
    membership_query_membersByCuisine.controller,
  );

  //////////////////////////////////////////////////////////////////////

  app.get('/docker_healthcheck', (_req, res) => res.send('OK'));
  app.get('/', (_req, res) => res.send('OK'));

  // Error handling middleware
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      log.error('Unhandled error:', err);
      res.status(500).json({
        error: err.message,
        stack: 'Available in logs',
      });
    },
  );

  // Initialize databases and start server
  app.listen(8080, () => {
    console.log('Server is running on port 8080');
  });
}

await main();
