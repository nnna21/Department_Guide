'use strict';
/**
 * Simple in-memory rate limiter middleware.
 * No external dependencies — suitable for offline, low-traffic deployments.
 *
 * Tracks requests per IP using a sliding window (token bucket approximation).
 */

const store = new Map(); // ip -> { count, windowStart }

/**
 * createRateLimiter(options) → Express middleware
 *
 * @param {object} opts
 * @param {number} opts.windowMs  - Window size in milliseconds (default: 60 000)
 * @param {number} opts.max       - Max requests per window per IP (default: 30)
 * @param {string} [opts.message] - Error message on rate limit
 */
function createRateLimiter({ windowMs = 60_000, max = 30, message = 'Too many requests, please try again later.' } = {}) {
  // Periodic cleanup to prevent unbounded memory growth
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store.entries()) {
      if (now - entry.windowStart > windowMs) store.delete(ip);
    }
  }, windowMs);
  // Allow process to exit even if the interval is still active
  if (cleanupInterval.unref) cleanupInterval.unref();

  return function rateLimiter(req, res, next) {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now - entry.windowStart > windowMs) {
      store.set(ip, { count: 1, windowStart: now });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

module.exports = { createRateLimiter };
