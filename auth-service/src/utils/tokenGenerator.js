const jwt = require('jsonwebtoken');
const RefreshToken = require('../model/RefreshToken')
const crypto = require('crypto');

const accessTokenGenerator = (user) => {
  const accessToken = jwt.sign({
    userId: user._id,
    userName: user.userName,
    email: user.email,
    role: user.role
  }, process.env.JWT_SECRET, {expiresIn: '15mins'})

  return accessToken
}

const refreshTokenGenerator = async (res, userId) => {
  const token = crypto.randomBytes(40).toString('hex')
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7)

  await RefreshToken.create({
    token,
    user: userId,
    expiresIn: expiresAt
  })

  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  })

  return token
}

module.exports = {
  accessTokenGenerator,
  refreshTokenGenerator
}