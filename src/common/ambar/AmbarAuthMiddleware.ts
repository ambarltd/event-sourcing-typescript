import { Request, Response, NextFunction } from 'express';

const VALID_USERNAME = process.env.AMBAR_HTTP_USERNAME;
const VALID_PASSWORD = process.env.AMBAR_HTTP_PASSWORD;

if (!VALID_USERNAME || !VALID_PASSWORD) {
    throw new Error('Environment variables AUTH_USERNAME and AUTH_PASSWORD must be set');
}

export const AmbarAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!authHeader.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Basic authentication required' });
    }

    try {
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
        const [username, password] = credentials.split(':');

        if (username === VALID_USERNAME && password === VALID_PASSWORD) {
            next();
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(401).json({ error: 'Invalid authentication format' });
    }
};