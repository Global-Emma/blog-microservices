const argon2 = require('argon2')
const mongoose = require('mongoose')

const authSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true
  },
  userName: {
    type: String,
    unique: true,
    trim: true
  },
  phoneNumber: {
    type: Number,
    required: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
  },
  refreshToken: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now()
  }
}, { timestamps: true })

authSchema.pre('save', async function (next){
  if (this.isModified('password')) {
    try {
      this.password = await argon2.hash(this.password);
      next()
    } catch (error) {
      return error;
    }
  }
})

authSchema.methods.validatePassword = async function(passwordInput) {
  try {
    return await argon2.verify(this.password, passwordInput)
  } catch (error) {
    throw error;
  }
}

module.exports = mongoose.model('Auth', authSchema)