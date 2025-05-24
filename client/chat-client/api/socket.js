import { io } from 'socket.io-client';
import { Platform } from 'react-native';

let socket = null;

export const connectSocket = async (userId) => {
  if (!socket) {
    socket = io(Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000', {
      transports: ['websocket'],
    });


    socket.on('connect', () => {
      console.log('Connected to Socket.IO');
      socket.emit('register', userId);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO');
    });
  }
};

export const joinChat = (chatId) => {
  if (socket?.connected) {
    socket.emit('joinChat', chatId);
  }
};

export const sendMessageSocket = (chatId, message) => {
  if (socket?.connected) {
    socket.emit('sendMessage', {
      chatId,
      message: { ...message, chat: chatId },
    });
  }
};


export const onNewMessage = (handler) => {
  socket?.off('newMessage');
  socket?.on('newMessage', handler);
};

export const onLastMessageUpdate = (handler) => {
  socket?.off("chatLastMessageUpdate");
  socket?.on("chatLastMessageUpdate", (msg) => {
    handler(msg);
  });
};


export const onStatusChange = (handler) => {
  socket?.off('userStatusChange');
  socket?.on('userStatusChange', handler);
};

export const requestOnlineUsers = () => {
  socket?.emit("getOnlineUsers");
};

export const onOnlineUsers = (handler) => {
  socket?.on("onlineUsers", handler);
};


export const onNewChatCreated = (handler) => {
  socket?.off('newChatCreated');
  socket?.on('newChatCreated', handler);
};

export const onMessageDeleted = (handler) => {
  socket?.off("messageDeleted");
  socket?.on("messageDeleted", handler);
};

export const onMessageUpdated = (handler) => {
  socket?.off("messageUpdated");
  socket?.on("messageUpdated", handler);
};

export const onChatDeleted = (handler) => {
  socket?.off("chatDeleted");
  socket?.on("chatDeleted", handler);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
