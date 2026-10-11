const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('../utils/logger');

const isDevelopment = process.env.NODE_ENV === 'development';

// Security Headers
const helmetMiddleware = helmet();

// CORS Configuration
// Fail closed: without ALLOWED_ORIGINS only the known site (and localhost in development) may call the API.
const DEFAULT_ORIGINS = isDevelopment
  ? ['http://localhost:3000', 'http://localhost:5173']
  : ['https://shrayutech.vercel.app'];

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
  : DEFAULT_ORIGINS;

if (!process.env.ALLOWED_ORIGINS) {
  logger.warn(`ALLOWED_ORIGINS is not set; CORS limited to: ${allowedOrigins.join(', ')}`);
}

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-requested-with'],
  // The API uses no cookies or browser credentials
  credentials: false,
  optionsSuccessStatus: 200
};

const corsMiddleware = cors(corsOptions);

const rateLimitHandler = (req, res, next, options) => {
  logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.method} ${req.originalUrl}`);
  res.status(options.statusCode).send(options.message);
};

// Rate Limiting
const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 contact requests per windowMs
  message: {
    success: false,
    error: 'Too many contact requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: rateLimitHandler
});

// Baseline limit for every /api route
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

const safeEqual = (a, b) => {
  const bufA = crypto.createHash('sha256').update(String(a)).digest();
  const bufB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Guards operator-only routes (diagnostics, seeding). Open in development; everywhere else
 * the request must carry the secret DIAGNOSTIC_KEY in the `x-diagnostic-key` header.
 * Unauthorized callers get a 404 so the routes are not discoverable.
 */
const requireDiagnosticKey = (req, res, next) => {
  if (isDevelopment) return next();
  const key = process.env.DIAGNOSTIC_KEY;
  const provided = req.get('x-diagnostic-key');
  if (key && provided && safeEqual(provided, key)) return next();
  logger.warn(`Unauthorized operator route access: ${req.method} ${req.originalUrl} from ${req.ip}`);
  return res.status(404).json({ success: false, error: 'Route not found' });
};

module.exports = {
  helmetMiddleware,
  corsMiddleware,
  contactRateLimiter,
  apiRateLimiter,
  requireDiagnosticKey
};
