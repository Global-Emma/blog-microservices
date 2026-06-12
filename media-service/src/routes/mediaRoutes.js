const express = require('express')
const multer  = require('multer')
const { uploadMedia, getMedias, deleteMedia } = require('../controllers/mediaController')
const { getUser, checkAdmin } = require('../middleware/authMiddleware')

const router = express.Router()

const storage = multer.memoryStorage()

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.post('/upload', upload.single('file'), getUser, checkAdmin, uploadMedia)

router.get('/get-media', getUser, checkAdmin, getMedias )

router.delete('/delete-media/:id', getUser, checkAdmin, deleteMedia )


module.exports = router