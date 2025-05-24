const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../middleware/fileUpload');
const auth = require('../middleware/authMiddleware');

router.post('/register', upload.single('avatar'), userController.register);
router.post('/login', userController.login);
router.get('/users', auth, userController.getAllUsers);
router.patch('/user/update', auth, upload.single('avatar'), userController.updateUserInfo);
router.post('/save-token', auth, userController.savePushToken);


module.exports = router;