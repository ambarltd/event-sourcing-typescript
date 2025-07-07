import 'reflect-metadata';
import express from 'express';
import { container } from 'tsyringe';
import { configureDependencies } from './di/container';
import { scopedContainer } from './di/scopedContainer';
import { MongoInitializer } from './common/util/MongoInitializer';
import { PostgresInitializer } from './common/util/PostgresInitializer';
import { log } from './common/util/Logger';
import { ControllerRegistry } from './common/registry/ControllerRegistry';

// Import controllers to ensure they are loaded
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

// Register controllers
const controllerRegistry = ControllerRegistry.getInstance();
controllerRegistry.registerController(SubmitApplicationCommandController);
controllerRegistry.registerController(MembersByCuisineQueryController);
controllerRegistry.registerController(EvaluateApplicationReactionController);
controllerRegistry.registerController(MembersByCuisineProjectionController);

// Create and use routes from registry
const routes = controllerRegistry.createRoutes();
app.use(routes);

// Add health check routes
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

const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    const mongoInitializer = container.resolve(MongoInitializer);
    const postgresInitializer = container.resolve(PostgresInitializer);

    await Promise.all([
      postgresInitializer.initialize(),
      mongoInitializer.initialize(),
    ]);

    app.listen(PORT, () => {
      log.info(`🚀 Server running on port ${PORT}`);
      log.info('📋 Registered controllers:');
      for (const [
        path,
        controllerClass,
      ] of controllerRegistry.getControllers()) {
        log.info(`  - ${controllerClass.name} at ${path}`);
      }
    });
  } catch (error) {
    log.error('Failed to start server:', error as Error);
    process.exit(1);
  }
}

startServer();
