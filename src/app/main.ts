import 'reflect-metadata';
import express from 'express';
import { container } from 'tsyringe';
import { configureDependencies, scopedContainer } from './di';
import { log, MongoInitializer, PostgresInitializer } from './common';


// Configure dependency injection
configureDependencies();


// Create express app
export const app = express();
app.use(express.json());


// Add scoped container middleware
app.use(scopedContainer);


app.get('/docker_healthcheck', (req, res) => res.send('OK'));
app.get('/', (req, res) => res.send('OK'));


// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    log.error('Unhandled error:', err);
    res.status(500).json({
        error: err.message,
        stack: 'Available in logs'
    });
});


// Initialize databases and start server

const mongoInitializer = container.resolve(MongoInitializer);
const postgresInitializer = container.resolve(PostgresInitializer);

Promise.all([
    postgresInitializer.initialize(),
    mongoInitializer.initialize()
])
    .then(() => {
        app.listen(8080, () => {
            console.log('Server is running on port 8080');
        });
    })
    .catch(error => {
        console.error('Failed to initialize databases:', error);
        process.exit(1);
    });