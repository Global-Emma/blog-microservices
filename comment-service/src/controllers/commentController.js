const Comment = require("../model/Comment")
const commentLogger = require("../utils/commentLogger")
const { publishEvent } = require("../utils/rabbitmq")


const addComment = async (req, res) => {
  commentLogger.info('Add comment Endpoint Reached.......')
  try {
    const comment = req.body

    if (!comment.commentContent) {
      return res.status(404).json({
        success: false,
        message: 'Please add a comment To continue'
      })
    };

    const newComment = await Comment.create({
      user: comment?.user,
      commentContent: comment?.commentContent,
      post: comment?.post
    })

    if (!newComment) {
      commentLogger.error('Error occurred while adding comment')
      return res.status(401).json({
        success: false,
        message: 'error adding comment..please try again'
      })
    }

    // Publish comment To Other Services 
    await publishEvent('new_comment_published', newComment)

    return res.status(200).json({
      success: true,
      message: 'New comment added Successfully',
      newComment
    })

  } catch (error) {
    commentLogger.error('Internal Server error Occured While Adding comment', error)
    return res.status(500).json({
      success: false,
      message: 'Internal Server error Occured While Adding comment'
    })
  }
}

const getPostComments = async (req, res) => {
  try {

    const getComments = await Comment.findOne({ post: req.params.id })

    if (!getComments) {
      return res.status(400).json({
        success: false,
        message: 'Could not get comments at this time...please try again later'
      })
    }


    return res.status(200).json({
      success: true,
      message: 'All Post Comments Gotten Successfully',
      comments: getComments,
    })
  } catch (error) {
    commentLogger.error('Internal Server error Occured While Getting All comments', error)
    return res.status(500).json({
      success: false,
      message: 'Internal Server error Occured While Getting All comments'
    })
  }
}

const getComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    if (!commentId) {
      commentLogger.warn('comment Id not Found')
      return res.status(404).json({
        success: false,
        message: 'comment Id not Found'
      })
    }

    const comment = await Comment.findById(commentId)
    // .populate('user').populate('mediaIds').exec()
    if (!comment) {
      commentLogger.warn('comment not Found')
      return res.status(404).json({
        success: false,
        message: 'comment not Found'
      })
    }

    commentLogger.info('comment Gotten Successfully')
    return res.status(200).json({
      success: true,
      message: 'comment Gotten Successfully',
      data: comment
    })

  } catch (error) {
      commentLogger.error('Internal Server error Occured While Getting comment', error)
      return res.status(500).json({
        success: false,
        message: 'Internal Server error Occured While Getting comment'
      })
  }
}

const deleteComment = async (req, res)=>{
  try {
    const commentId = req.params.id;
    if (!commentId) {
      commentLogger.warn('comment Id not Found')
      return res.status(404).json({
        success: false,
        message: 'comment Id not Found'
      })
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
      commentLogger.warn('comment not Found')
      return res.status(404).json({
        success: false,
        message: 'comment not Found'
      })
    }

    if(comment.user.toString() !== req.userInfo.userId.toString()){
      commentLogger.warn('Unauthorized Request...User not Owner of comment')
      return res.status(401).json({
        success: false,
        message: 'Unauthorized Request...User not Owner of comment'
      })
    }

    const deleteComment = await Comment.findByIdAndDelete(commentId)

    if (!deleteComment) {
      commentLogger.warn('Error Occured While Deleting comment')
      return res.status(400).json({
        success: false,
        message: 'Error Occured While Deleting comment...please try again'
      })
    }

    // Publish comment Deletion Event To Other Services
    await publishEvent('comment_deleted', deletecomment)
  } catch (error) {
    commentLogger.error('Internal Server error Occured While Deleting comment', error)
    return res.status(500).json({
      success: false,
      message: 'Internal Server error Occured While Deleting comment'
    })
  }
}

module.exports = {
  addComment,
  getPostComments,
  getComment,
  deleteComment
}