const mongoose = require('mongoose')

const postSchema = new mongoose.Schema({
  user:{
    type: Object
  },
  category: {
    type: String,
    enum: ['news', 'lifestyle', 'fashion', 'education']
  },
  postContent: {
    type: String,
  },
  comments:[
    {
      type: Object
    }
  ],
  media: [
    {
      mediaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
      },
      secureUrl: {
        type: String
      },
      publicId: {
        type: String
      }
    }
  ],
  postHeading: {
    type: String,
    required: true
  }
}, {timestamps: true})

module.exports = mongoose.model('Post', postSchema)