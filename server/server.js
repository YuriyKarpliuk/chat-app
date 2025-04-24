const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require('path');


const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use("/api/auth", userRoutes);
app.use("/api/", messageRoutes);
app.use("/api/", chatRoutes);


mongoose.connect(process.env.MONGO_URI, {
}).then(() => {
  console.log("MongoDB connected");
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}).catch(err => console.error("DB error:", err));
