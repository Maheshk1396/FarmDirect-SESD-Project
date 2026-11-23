// backend/src/middleware/errorHandler.js
const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Application Error:', err);

  // Multer upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(res, 'Uploaded file exceeds the maximum size limit of 5MB.', 400);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return errorResponse(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : null);
};

module.exports = errorHandler;
