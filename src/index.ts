import 'reflect-metadata';
import express from 'express';
import { container } from 'tsyringe';
import { configureDependencies } from './di/container';
import { scopedContainer } from './di/scopedContainer';
import { MongoInitializer } from './common/util/MongoInitializer';
import { PostgresInitializer } from './common/util/PostgresInitializer';
import { log } from './common/util/Logger';
import { AmbarAuthMiddleware } from './common/ambar/AmbarAuthMiddleware';

// Import events to trigger @EventType registration
import './domain/cookingClub/membership/event';
import { SubmitApplicationCommandController } from './domain/cookingClub/membership/command/submitApplication/SubmitApplicationCommandController';
import { MembersByCuisineQueryController } from './domain/cookingClub/membership/query/membersByCuisine/MembersByCuisineQueryController';
import { EvaluateApplicationReactionController } from './domain/cookingClub/membership/reaction/evaluateApplication/EvaluateApplicationReactionController';
import { MembersByCuisineProjectionController } from './domain/cookingClub/membership/projection/membersByCuisine/MembersByCuisineProjectionController';

// Configure dependency injection
configureDependencies();

// Create express app
const app = express();
app.use(express.json());

// Add scoped container middleware
app.use(scopedContainer);

// Add routes
app.use('/api/v1/cooking-club/membership/command', (req, res, next) => {
  const controller = req.container.resolve(SubmitApplicationCommandController);
  return controller.router(req, res, next);
});
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
app.get('/docker_healthcheck', (req, res) => res.send('OK'));
app.get('/', (req, res) => res.send('OK'));

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
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
