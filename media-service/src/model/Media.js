const mongoose = require('mongoose')

const mediaSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auth',
    required: true
  },
  originalname:{
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  secureUrl: {
    type: String,
    required: true
  },
  resourceType: {
    type: String
  },
  mimetype: {
    type: String
  }
}, {timestamps: true})

module.exports = mongoose.model('Media', mediaSchema)