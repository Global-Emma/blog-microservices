const express = require('express')
const { userSignUp, userSignIn, refreshTokenController, getUserDetails, logOut, getAllUsers, changeUserRole, deleteUser } = require('../controllers/authController');
const { getUser, checkAdmin } = require('../middleware/authMiddleware');

const router = express.Router()

router.post('/register', userSignUp);
router.post('/login', userSignIn)
router.post('/refresh', refreshTokenController)
router.get('/details', getUser, getUserDetails)
router.post('/logout', getUser, logOut)
router.get('/users', getUser, checkAdmin,  getAllUsers)
router.put('/role/:id', getUser, checkAdmin,  changeUserRole)
router.delete('/delete/:id', getUser, checkAdmin,  deleteUser)

module.exports = router