const logger = require('../utils/logger');

const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';

  // Log the error for internal tracking
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, {
    stack: err.stack,
    requestId: req.requestId
  });

  // Return a clean response to the client
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'An internal server error occurred. Please try again later.' 
      : message,
    requestId: req.requestId
  });
};

module.exports = { globalErrorHandler };
