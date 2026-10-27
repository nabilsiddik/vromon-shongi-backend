import express, { type Request, type Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { router } from './app/routes/index.js'
import { envVars } from './app/config/env.config.js'
import { notFound } from './app/middlewares/notFound.js'
import globalErrorHandler from './app/middlewares/globalErrorHandler.js'
import bodyParser from 'body-parser';
import { SubscriptionControllers } from './app/modules/subscription/subscription.controllers.js'
import { Server } from 'socket.io';
import { createServer } from 'node:http'
import { initSocket } from './app/socket/socket.config.js'

export const app = express()
export const server = createServer(app);

// Initialize socket.io
initSocket(server)

const healthCheckHandler = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Vromon Shongi Server is healthy and active',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
};

// Health routes for uptime monitors (cron-job.org, UptimeRobot, etc.)
app.all('/health', healthCheckHandler);
app.all('/api/v1/health', healthCheckHandler);


app.post('/webhook', bodyParser.raw({ type: 'application/json' }), SubscriptionControllers.stripeWebhook);

app.set('trust proxy', 1)
app.use(express.json())
app.use(cors({
    origin: ['http://localhost:3000', 'https://travel-buddy-frontend-six.vercel.app'],
    credentials: true
}))
app.use(cookieParser())

app.use('/api/v1', router)

app.all('/', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        message: `Vromon Shongi Server is running...`,
        timestamp: new Date().toISOString()
    });
});

app.use(notFound)
app.use(globalErrorHandler)