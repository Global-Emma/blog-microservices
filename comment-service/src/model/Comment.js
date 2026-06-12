const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema({
  user:{
    type: Object
  },
  commentContent: {
    type: String,
  },
  post: {
    type: Object
  }
}, {timestamps: true})

module.exports = mongoose.model('Comment', commentSchema)