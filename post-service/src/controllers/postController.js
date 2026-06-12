const Post = require("../model/Post");
const postLogger = require("../utils/postLogger");
const { publishEvent } = require("../utils/rabbitmq");

const addPost = async (req, res) => {
  postLogger.info("Add Post Endpoint Reached.......");
  try {
    const post = req.body;

    if (!post.postHeading && !post.postContent) {
      return res.status(404).json({
        success: false,
        message: "Please add a Post To continue",
      });
    }

    const newPost = await Post.create({
      user: post.user,
      postContent: post?.postContent,
      media: post?.media || [],
      category: post?.category,
      postHeading: post?.postHeading,
    });

    if (!newPost) {
      postLogger.error("Error occurred while adding post");
      return res.status(401).json({
        success: false,
        message: "error adding post..please try again",
      });
    }

    // Publish Post To Other Services
    await publishEvent("new_post_published", newPost);

    return res.status(200).json({
      success: true,
      message: "New Post added Successfully",
      newPost,
    });
  } catch (error) {
    postLogger.error("Internal Server error Occured While Adding Post", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server error Occured While Adding Post",
    });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 2;
    const skip = (page - 1) * limit;

    const getPosts = await Post.find({});
    // .populate('user')
    // .populate('mediaIds')
    // .skip(skip)
    // .limit(limit)
    // .exec();

    if (!getPosts) {
      return res.status(400).json({
        success: false,
        message: "Could not get posts at this time...please try again later",
      });
    }

    const totalNoOfPosts = await Post.countDocuments();

    const totalNoOfPages = Math.ceil(totalNoOfPosts / limit);

    return res.status(200).json({
      success: true,
      message: "All Posts Gotten Successfully",
      posts: getPosts,
      totalNoOfPosts,
      totalNoOfPages,
    });
  } catch (error) {
    postLogger.error(
      "Internal Server error Occured While Getting All Posts",
      error,
    );
    return res.status(500).json({
      success: false,
      message: "Internal Server error Occured While Getting All Posts",
    });
  }
};

const getPost = async (req, res) => {
  try {
    const postId = req.params.id;
    if (!postId) {
      postLogger.warn("Post Id not Found");
      return res.status(404).json({
        success: false,
        message: "Post Id not Found",
      });
    }

    const post = await Post.findById(postId);
    // .populate('user').populate('mediaIds').exec()
    if (!post) {
      postLogger.warn("Post not Found");
      return res.status(404).json({
        success: false,
        message: "Post not Found",
      });
    }

    postLogger.info("Post Gotten Successfully");
    return res.status(200).json({
      success: true,
      message: "Post Gotten Successfully",
      data: post,
    });
  } catch (error) {
    postLogger.error("Internal Server error Occured While Getting Post", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server error Occured While Getting Post",
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    if (!postId) {
      postLogger.warn("Post ID parameter missing from request");
      return res.status(400).json({
        success: false,
        message: "Post ID is required",
      });
    }

    // 1. Fetch document once
    const post = await Post.findById(postId);
    if (!post) {
      postLogger.warn(`Delete target failed: Post ${postId} not found`);
      return res.status(404).json({
        success: false,
        message: "Post not Found",
      });
    }

    // 2. Multi-tier Authorization logic: Owner check OR Admin privilege bypass
    const isOwner = post.user.toString() === req.userInfo.userId.toString();
    const isAdmin = req.userInfo.role === "admin";

    if (!isOwner && !isAdmin) {
      postLogger.warn(`Unauthorized delete attempt on post ${postId} by user ${req.userInfo.userId}`);
      return res.status(403).json({
        success: false,
        message: "Unauthorized Request: You do not have permission to delete this post",
      });
    }

    // 3. Optimized Document Deletion using loaded instance
    await post.deleteOne();

    // 4. Publish Post Deletion Event To Microservices (RabbitMQ / Cloudinary Purger)
    await publishEvent("post_deleted", post);

    // FIX: Corrected copy-paste log description typo from error to success info
    postLogger.info(`Post ${postId} successfully deleted by user ${req.userInfo.userId}`);
    
    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });

  } catch (error) {
    postLogger.error("Internal Server error Occured While Deleting Post", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server error Occured While Deleting Post",
    });
  }
};

const editPost = async (req, res) => {
  try {
    const postId = req.params.id; // Double-check that your Express route uses /:id and not /:postId
    
    if (!postId) {
      postLogger.warn("Post Id not Found");
      return res.status(400).json({ // 400 Bad Request is more accurate for a missing ID parameter
        success: false,
        message: "Post Id not Found",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      postLogger.warn(`Post not Found with ID: ${postId}`);
      return res.status(404).json({
        success: false,
        message: "Post not Found",
      });
    }

    // Authorization check
    if (post.user.toString() !== req.userInfo.userId.toString()) {
      postLogger.warn(`Unauthorized Request... User ${req.userInfo.userId} is not Owner of Post ${postId}`);
      return res.status(403).json({ // 403 Forbidden is more accurate than 401 when authenticated but unauthorized
        success: false,
        message: "Unauthorized Request...User not Owner of Post",
      });
    }

    const postBody = req.body || {};
      
    post.postHeading = postBody.postHeading || post.postHeading;
    post.category = postBody.category || post.category;
    post.postContent = postBody.postContent || post.postContent;
    post.media = postBody.media || post.media; 

    await post.save();

    await publishEvent("post_edited", post);

    return res.status(200).json({
      success: true,
      message: 'Post Updated Successfully',
      data: post 
    });
    
  } catch (error) {
    postLogger.error("Internal Server error Occured While Editing Post", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server error Occured While Editing Post",
    });
  }
};

module.exports = {
  addPost,
  getAllPosts,
  getPost,
  deletePost,
  editPost,
};
