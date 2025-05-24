const Chat = require('../models/Chat');

exports.createChat = async (req, res) => {
  try {
    const { name, isGroup } = req.body;
    let members = req.body.members || [];
    
    if (!Array.isArray(members)) {
      members = [members];
    }
    
    const uniqueMembers = Array.from(new Set([...members, req.user.userId]));
    
    let groupImageUrl = null;
    if (req.file) {
      groupImageUrl = `/uploads/${req.file.filename}`;
    }

    let chat = await Chat.create({
      name,
      isGroup,
      members: uniqueMembers,
      groupImageUrl,
    });

    chat = await Chat.findById(chat._id).populate('members');
    
    if (global._io) {
      members.forEach((userId) => {
        const socketId = global.onlineUsers?.[userId];
        if (socketId) {
          global._io.to(socketId).emit('newChatCreated', chat);
        }
      });
    }
    res.status(201).json(chat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


  
  exports.getUserChats = async (req, res) => {
    try {
      const userId = req.user.userId;
      const chats = await Chat.find({ members: userId }).populate('members messages');
      res.json(chats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  exports.updateChat = async (req, res) => {
    try {
      const chatId = req.params.chatId;
      const userId = req.user.userId;
  
      const chat = await Chat.findById(chatId);
      if (!chat) return res.status(404).json({ message: 'Chat not found' });
  
      if (!chat.members.map(m => m.toString()).includes(userId)) {
        return res.status(403).json({ message: 'You are not a member of this chat' });
      }
  
      const { name, members } = req.body;
      if (name) chat.name = name;
      if (members) chat.members = members;
  
      await chat.save();
      res.json(chat);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  
  exports.deleteChat = async (req, res) => {
    try {
      const chatId = req.params.chatId;
      const userId = req.user.userId;
  
      const chat = await Chat.findById(chatId);
      if (!chat) return res.status(404).json({ message: 'Chat not found' });
  
      if (!chat.members.map(m => m.toString()).includes(userId)) {
        return res.status(403).json({ message: 'You are not a member of this chat' });
      }
  
      await Chat.deleteOne({ _id: chatId });
  
      if (global._io) {
        global._io.emit("chatDeleted", chatId);
      }
  
      res.json({ message: 'Chat deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };