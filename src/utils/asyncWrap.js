'use strict';

/**
 * Wraps an async Express route handler in a try/catch block,
 * forwarding errors to the next() error middleware.
 *
 * @param {Function} fn - Async route handler
 * @returns {Function}  - Express middleware
 */
const asyncWrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncWrap;
