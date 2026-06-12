const jwt = require('jsonwebtoken');
const apiLogger = require('../src/utils/apiLogger');

const authValidation = async (req, res, next) => {
  const publicGetPostsPath = /^\/(posts)(\/.*)?$/;
  const publicGetUserPath = /^\/(register|login|refresh)(\/.*)?$/;

  if ((req.method === 'GET' && publicGetPostsPath.test(req.url)) || (req.method === 'POST' && publicGetUserPath.test(req.url))) {
    return next();
  }

  try {
    const authHeaders = req.headers['authorization'];
    const token = authHeaders && authHeaders.split(' ')[1];

    if (!token) {
      apiLogger.warn('no token provided')
      return res.status(400).json({
        success: false,
        message: 'No Token Provided'
      })
    };

    const verifyToken = jwt.verify(token, process.env.JWT_SECRET)

    if (!verifyToken) {
      apiLogger.warn('invalid token provided')
      return res.status(400).json({
        success: false,
        message: 'Invalid Token Provided'
      })
    };

    req.userInfo = verifyToken;

    next()
  } catch (error) {
      apiLogger.error('Session Expired', error)
      return res.status(400).json({
        success: false,
        message: 'Session Expired'
      })
    
  }
}

module.exports = authValidation