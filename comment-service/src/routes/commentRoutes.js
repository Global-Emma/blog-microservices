const { addComment, getPostComments, getComment, deleteComment } = require('../controllers/commentController')
const { getUser, checkAdmin } = require('../middleware/authMiddleware')

const router = require('express').Router()

router.post('/add-comment', getUser, addComment)
router.get('/get-comments/:id', getUser, getPostComments)
router.get('/get-comments/:id', getUser, getComment)
router.delete('/delete-comment/:id', getUser, deleteComment)
module.exports = router