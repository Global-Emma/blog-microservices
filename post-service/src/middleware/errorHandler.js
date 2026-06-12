const postLogger = require("../utils/postLogger")

const errorHandler = (req, res, err)=>{
  postLogger.error('Global Error Occured', err.stack)

  return res.status(err.status || 500).json({
    success: false,
    message: err.stack || 'Internal server error'
  })
}

module.exports = errorHandler