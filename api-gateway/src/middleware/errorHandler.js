const apiLogger = require("../utils/apiLogger")


const errorHandler = (err, req, res, next) => {
  if (!err) {
    return next();
  }

  apiLogger.error(err.stack || err);

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
};

module.exports = errorHandler