const commentLogger = require('../utils/commentLogger')
const Comment = require('../model/Comment')

const consumedEvent = async(event)=>{
  try {
  const {_id, comments} = event
  const comment = Comment.find({_id: {$in: comments._id}})

      await Comment.findByIdAndDelete(comment._id);
      commentLogger.info(`Deleted Comments ${comment._id} associated with Deleted Post ${_id}`);
    commentLogger.info(`Processed Deletion of Comments For Post Id: ${_id}`);
    
  } catch (error) {
    commentLogger.error('Error Occured While Deleting Comments for Deleted Post:', error);
  }
}

module.exports = {
  consumedEvent
}