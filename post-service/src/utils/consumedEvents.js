const Post = require("../model/Post");
const postLogger = require("./postLogger");


const consumedEvents = async (event) => {
  try {
    const { post } = event;
    const postId = post._id;
    const getPost = await Post.findById(postId);

    if (!getPost) {
      postLogger.warn(`Post with Id ${postId} not Found for Updating Post Views`)
      return;
    }

    getPost.comments.push(event);
    await getPost.save();
    postLogger.info(`Updated Post Views for Post Id: ${postId} Successfully`)

  } catch (error) {
    postLogger.error('Error occurred while consuming event:', error);
  }

}

module.exports = {
  consumedEvents 
}