const mediaLogger = require("../utils/mediaLogger");


const getUser = (req, res, next)=>{
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-role'];

  if(!userId || !role){
    mediaLogger.warn('No UserId Provided')
    return res.status(404).json({
      success: false,
      message: 'No UserId Provided'
    })
  }

  req.userInfo = {userId, role}
  next()
}

const checkAdmin = (req, res, next)=>{
  const userRole = req.userInfo.role
  
  if(userRole !== 'admin'){
    mediaLogger.warn('Only Admins Are Allowed to Access')
    return res.status(403).json({
        success: false,
        message: 'Only Admins Are Allowed to Access'
      })
  }

  next()
}

module.exports = {
  getUser,
  checkAdmin
}