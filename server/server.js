const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } }); 
global._io = io;

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use("/api/auth", userRoutes);
app.use("/api/", messageRoutes);
app.use("/api/", chatRoutes);

global.onlineUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register", (userId) => {
    global.onlineUsers[userId] = socket.id;
    io.emit("userStatusChange", { userId, status: "online" });
    io.to(socket.id).emit("onlineUsers", Object.keys(onlineUsers));
  });

  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
  });

  socket.on("sendMessage", (data) => {
    console.log(data.message);
    io.emit("newMessage", data.message);
    io.emit("chatLastMessageUpdate", data.message);
  });
  

  socket.on("deleteMessage", (data) => {
    io.to(data.chatId).emit("messageDeleted", data.messageId);
  });

  socket.on("updateMessage", (data) => {
    io.to(data.chatId).emit("messageUpdated", data);
  });

  socket.on("chatDeleted", (chatId) => {
    io.emit("chatDeleted", chatId);
  });

  socket.on("disconnect", () => {
    const userId = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);
    if (userId) {
      delete onlineUsers[userId];
      io.emit("userStatusChange", { userId, status: "offline" });
    }
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => console.log(`Server with Socket.IO running on port ${PORT}`));
  })
  .catch(err => console.error("DB error:", err));
