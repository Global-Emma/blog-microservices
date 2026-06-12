const mongoose = require('mongoose')

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Auth'
  },
  expiresIn: {
    type: Date,
    required: true
  }
})

refreshTokenSchema.index({expiresIn: 1}, {expiresAfterSeconds: 0})

module.exports = mongoose.model('RefreshToken', refreshTokenSchema )