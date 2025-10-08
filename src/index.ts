import 'tsconfig-paths/register'; // enable absolute paths
import 'reflect-metadata';
import express from 'express';
import { container } from 'tsyringe';
import { configureDependencies } from '@/di/container';
import { scopedContainer } from '@/di/scopedContainer';
import { MongoInitializer } from '@/common/util/MongoInitializer';
import { PostgresInitializer } from '@/common/util/PostgresInitializer';
import { log } from '@/common/util/Logger';
import { AmbarAuthMiddleware } from '@/common/ambar/AmbarAuthMiddleware';
import { MembersByCuisineQueryController } from '@/domain/cookingClub/membership/query/membersByCuisine/MembersByCuisineQueryController';
import { EvaluateApplicationReactionController } from '@/domain/cookingClub/membership/reaction/evaluateApplication/EvaluateApplicationReactionController';
import { MembersByCuisineProjectionController } from '@/domain/cookingClub/membership/projection/membersByCuisine/MembersByCuisineProjectionController';
import { handleCommand } from '@/app/commandHandler';
import { handleReaction, wrapWithEventStore } from '@/app/reactionHandler';
import * as membership_command_submitApplication from '@/domain/cookingClub/membership2/command/membership/submitApplication';
import * as membership_reaction_evaluateApplication from '@/domain/cookingClub/membership2/reaction/membership/evaluateApplication';

async function main() {
  // Configure dependency injection
  const { withEventStore, services, projections } =
    await configureDependencies();

  // Create express app
  const app = express();
  app.use(express.json());

  // Add scoped container middleware
  app.use(scopedContainer);

  //////////////////////////////////////////////////////////////////////

  app.use(
    '/api/v1/cooking-club/membership/command/submit-application',
    handleCommand(
      withEventStore,
      services,
      projections,
      membership_command_submitApplication.controller,
    ),
  );

  app.use(
    '/api/v1/cooking-club/membership/reaction/evaluateApplication',
    handleReaction(
      wrapWithEventStore(withEventStore),
      services,
      projections,
      membership_reaction_evaluateApplication.controller,
    ),
  );

  //////////////////////////////////////////////////////////////////////

  // Add routes
  app.use(
    '/api/v1/cooking-club/membership/projection',
    AmbarAuthMiddleware,
    (req, res, next) => {
      const controller = req.container.resolve(
        MembersByCuisineProjectionController,
      );
      return controller.router(req, res, next);
    },
  );
  app.use('/api/v1/cooking-club/membership/query', (req, res, next) => {
    const controller = req.container.resolve(MembersByCuisineQueryController);
    return controller.router(req, res, next);
  });
  app.use(
    '/api/v1/cooking-club/membership/reaction',
    AmbarAuthMiddleware,
    (req, res, next) => {
      const controller = req.container.resolve(
        EvaluateApplicationReactionController,
      );
      return controller.router(req, res, next);
    },
  );
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

  const mongoInitializer = container.resolve(MongoInitializer);
  const postgresInitializer = container.resolve(PostgresInitializer);

  Promise.all([postgresInitializer.initialize(), mongoInitializer.initialize()])
    .then(() => {
      app.listen(8080, () => {
        console.log('Server is running on port 8080');
      });
    })
    .catch((error) => {
      console.error('Failed to initialize databases:', error);
      process.exit(1);
    });
}

await main();
