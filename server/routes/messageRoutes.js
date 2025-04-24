const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/fileUpload');
router.use(authMiddleware); 

router.post('/message', upload.single('image'), messageController.sendMessage);
router.get('/messages/:chatId', messageController.getChatMessages);
router.patch('/message/edit/:messageId', messageController.updateMessage);
router.delete('/message/delete/:messageId', messageController.deleteMessage);
module.exports = router;
