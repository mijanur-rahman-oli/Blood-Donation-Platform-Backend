import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import config from './app/config';
import routes from './app/routes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import notFound from './app/middlewares/notFound';
import { generalRateLimiter } from './app/middlewares/rateLimiter';

const app: Application = express();

// --- Security & core middleware ---
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  }),
);
app.use(generalRateLimiter);
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

// SSLCommerz posts success/fail/cancel/ipn callbacks as form-urlencoded data.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Health check ---
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Blood Donation & Emergency Platform API is running',
    data: { version: config.apiVersion, env: config.env },
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'OK', data: { uptime: process.uptime() } });
});

// --- API routes ---
app.use(`/api/${config.apiVersion}`, routes);

// --- 404 + centralized error handling ---
app.use(notFound);
app.use(globalErrorHandler);

export default app;
