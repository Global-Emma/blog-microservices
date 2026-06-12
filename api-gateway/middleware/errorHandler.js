const authLogger = require("../src/utils/authLogger")

const errorHandler = (req, res, err) =>{
  authLogger.error('Global Error Occured', err.stack)

  return res.status(err.status || 500).json({
    success: false,
    message: err.message ||'Internal Server Error'
  })
}

module.exports = errorHandler