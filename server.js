require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const Room = require('./models/Room');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connected'));

io.on('connection', (socket) => {
  socket.on('join_room', async ({ roomId, username }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username; // Store username temporarily on this connection

    // 1. Fetch History
    const history = await Message.find({ roomId }).sort({ createdAt: 1 });
    socket.emit('load_history', history);

    // 2. Add to active DB tracking
    await Room.findOneAndUpdate(
      { roomId },
      { $addToSet: { activeUsers: socket.id } },
      { upsert: true, new: true }
    );

    // 3. SYSTEM NOTIFICATION: Send "User Joined" to chat
    io.to(roomId).emit('receive_message', {
      _id: Date.now().toString(), // Temp ID so React doesn't complain
      sender: 'System',
      message: `${username} joined the session`,
      type: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    });

    // 4. Update Header Usernames (Real-time tracking without DB clutter)
    const sockets = await io.in(roomId).fetchSockets();
    io.to(roomId).emit('room_users', sockets.map(s => s.username));
    
    console.log(`👤 ${username} joined raw room: ${roomId}`);
  });

  socket.on('send_message', async (data) => {
    const newMessage = new Message({
      roomId: data.roomId,
      sender: data.sender,
      message: data.message,
      type: data.type,
      timestamp: data.timestamp
    });
    await newMessage.save();
    io.to(data.roomId).emit('receive_message', newMessage);
  });

  socket.on('disconnect', async () => {
    const roomId = socket.roomId;
    if (roomId) {
      const room = await Room.findOneAndUpdate(
        { roomId },
        { $pull: { activeUsers: socket.id } },
        { new: true }
      );

      // 5. SYSTEM NOTIFICATION: Send "User Left" to chat & update Header
      if (socket.username) {
        io.to(roomId).emit('receive_message', {
          _id: Date.now().toString(),
          sender: 'System',
          message: `${socket.username} left the session`,
          type: 'system',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        });
        
        const sockets = await io.in(roomId).fetchSockets();
        io.to(roomId).emit('room_users', sockets.map(s => s.username));
      }

      // 6. CORE LOGIC: Wipe Room if empty
      if (room && room.activeUsers.length === 0) {
        console.log(`🧹 Room ${roomId} empty. Wiping all data.`);
        await Room.deleteOne({ roomId });
        await Message.deleteMany({ roomId });
      }
    }
  });
});

server.listen(5000, () => console.log('🚀 Server running on 5000'));