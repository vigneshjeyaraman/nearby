# Quick Backend Setup with Node.js and Socket.IO

## Option 1: Use a free service like Firebase
1. Go to https://firebase.google.com/
2. Create a new project
3. Enable Realtime Database
4. Replace the config in firebase-integration.js
5. Add Firebase scripts to your HTML

## Option 2: Deploy a simple Node.js server

Create these files:

### package.json
```json
{
  "name": "proximity-chat-server",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.7.0",
    "cors": "^2.8.5"
  }
}
```

### server.js
```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store messages in memory (use a database in production)
let messages = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send recent messages to new connection
  socket.emit('recent-messages', messages.slice(-50));

  // Handle new messages
  socket.on('send-message', (messageData) => {
    const message = {
      ...messageData,
      timestamp: new Date(),
      socketId: socket.id
    };

    messages.push(message);

    // Broadcast to users within range
    socket.broadcast.emit('new-message', message);
  });

  // Handle location updates
  socket.on('location-update', (location) => {
    socket.location = location;
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Deploy Options:
- **Railway**: https://railway.app
- **Render**: https://render.com  
- **Heroku**: https://heroku.com
- **Vercel**: https://vercel.com (for serverless)

## Then update your app to use WebSockets instead of localStorage