const Message = require('../models/Message');
const Chat = require('../models/Chat');
const admin = require("../firebase/firebase");
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const senderId = req.user.userId;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const message = await Message.create({
      chat: chatId,
      sender: senderId,
      content,
      imageUrl,
    });

    await Chat.findByIdAndUpdate(chatId, {
      $push: { messages: message._id },
      lastMessage: {
        content: content || '📷 Image',
        timestamp: message.timestamp,
      },
    });
    const chat = await Chat.findById(chatId).populate('members');
    const recipient = chat.members.find(member => member._id.toString() !== senderId);

    if (recipient?.pushToken) {
      const fcmMessage = {
        notification: {
          title: `New Message from ${req.user.username || 'user'}`,
          body: content ? content : '📷 Image sent',
        },
        token: recipient.pushToken,
      };

      await admin.messaging().send(fcmMessage);
    }
    const populated = await message.populate('sender');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};



exports.getChatMessages = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const messages = await Message.find({ chat: chatId }).populate('sender');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMessage = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const { content } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.sender.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    message.content = content;
    await message.save();

    if (global._io) {
      global._io.to(message.chat.toString()).emit("messageUpdated", {
        _id: message._id,
        content: message.content
      });
    }
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.sender.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    await Message.deleteOne({ _id: messageId });

    if (global._io) {
      global._io.to(message.chat.toString()).emit("messageDeleted", messageId);
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};