const { addPost, getAllPosts, getPost, deletePost, editPost } = require('../controllers/postController')
const { getUser, checkAdmin } = require('../middleware/authMiddleware')

const router = require('express').Router()

router.post('/add-post', getUser, checkAdmin, addPost)
router.get('/get-posts', getAllPosts)
router.get('/get-posts/:id', getPost)
router.delete('/delete-post/:id', getUser, checkAdmin, deletePost)
router.post('/edit-post/:id', getUser, checkAdmin, editPost)
module.exports = router