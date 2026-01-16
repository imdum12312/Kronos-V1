import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import express from "express";
import morgan from "morgan";

const app = express();
const port = process.env.PORT || 5001;

// Rate limiting configuration
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // Max requests per window

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const record = rateLimitMap.get(ip);

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }

  if (record.count >= MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
  }

  record.count++;
  next();
}

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

// Security headers middleware
app.use((req, res, next) => {
  // Content Security Policy - Relaxed for game compatibility
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://*.github.io; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https: blob:; connect-src 'self' ws: wss: https:; frame-src 'self' blob:; worker-src 'self' blob:; font-src 'self' data: https://cdn.jsdelivr.net;"
  );

  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Remove powered-by header
  res.removeHeader('X-Powered-By');

  next();
});

// HTTP request logging
app.use(morgan('combined'));

// Apply rate limiting
app.use(rateLimit);

// Static files
app.use(express.static("./public"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(port, () => {
  console.log(`Server started on port: ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Enhanced WISP logging
const wispLogger = {
  info: (msg) => console.log(`[WISP INFO] ${msg}`),
  warn: (msg) => console.warn(`[WISP WARN] ${msg}`),
  error: (msg) => console.error(`[WISP ERROR] ${msg}`),
};

server.on("upgrade", (request, socket, head) => {
  try {
    wisp.routeRequest(request, socket, head, {
      logger: wispLogger,
    });
  } catch (error) {
    console.error('WebSocket upgrade error:', error);
    socket.destroy();
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
