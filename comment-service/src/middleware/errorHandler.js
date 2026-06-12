const commentLogger = require("../utils/commentLogger")

const errorHandler = (req, res, err)=>{
  commentLogger.error('Global Error Occured', err.stack)

  return res.status(err.status || 500).json({
    success: false,
    message: err.stack || 'Internal server error'
  })
}

module.exports = errorHandler