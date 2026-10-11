const logger = require('../utils/logger');

const globalErrorHandler = (err, req, res, next) => {
  // body-parser and http-errors use `status`; `expose` marks messages that are safe for clients
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected error occurred';
  const clientMessage = process.env.NODE_ENV === 'development' || (err.expose && statusCode < 500)
    ? message
    : 'An internal server error occurred. Please try again later.';

  // Log the error for internal tracking
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, {
    stack: err.stack,
    requestId: req.requestId
  });

  // Return a clean response to the client
  res.status(statusCode).json({
    success: false,
    error: clientMessage,
    requestId: req.requestId
  });
};

module.exports = { globalErrorHandler };
