const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/fileUpload');
router.use(authMiddleware); 


router.post('/chat/create', upload.single('groupImage'), chatController.createChat);
router.get('/chats', chatController.getUserChats);

router.patch('/chat/edit/:chatId', chatController.updateChat);
router.delete('/chat/delete/:chatId', chatController.deleteChat);

module.exports = router;
