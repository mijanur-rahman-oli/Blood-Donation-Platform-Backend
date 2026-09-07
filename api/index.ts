import app from '../src/app';

// Vercel Node.js runtime treats the default export as a request handler.
// We reuse the same Express app used by the standalone server (src/server.ts),
// which is the entry point for Render/Docker deployments instead.
export default app;
