'use strict';
const rateLimit = require('express-rate-limit');

const authRateLimit = rateLimit({
  windowMs:  15 * 60 * 1000,
  max:       Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many authentication attempts. Wait 15 minutes and try again.' },
  skipFailedRequests: false,
});

const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max:      Number(process.env.AI_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many AI requests. Please wait a minute and try again.' },
});

const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max:      20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many upload requests. Please slow down.' },
});

const adminRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max:      60,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests to admin endpoint.' },
});

module.exports = { authRateLimit, aiRateLimit, uploadRateLimit, adminRateLimit };
