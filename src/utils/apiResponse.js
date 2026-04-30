'use strict';

/**
 * Standardized API response helper.
 */
const apiResponse = {
  /**
   * Success response
   * @param {object} res  - Express response object
   * @param {any}    data - Payload to return
   * @param {number} [statusCode=200]
   */
  success(res, data, statusCode = 200) {
    return res.status(statusCode).json({ success: true, data });
  },

  /**
   * Error response
   * @param {object} res     - Express response object
   * @param {string} message - Human-readable error message
   * @param {number} [statusCode=500]
   * @param {any}    [errors=null] - Optional validation errors array
   */
  error(res, message, statusCode = 500, errors = null) {
    const body = { success: false, error: message };
    if (errors) body.errors = errors;
    return res.status(statusCode).json(body);
  },
};

module.exports = apiResponse;
