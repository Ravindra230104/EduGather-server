const express = require('express');
const morgan = require('morgan');
const bodyparser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();
const Message = require('./models/message.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: 'http://localhost:3000' } });

// DB Connection
mongoose.connect(process.env.DATABASE_CLOUD, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('DB Connected successfully'))
.catch(err => console.log('DB Connection Error:', err));

// Define a Chat Message Schema and Model

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const categoryRoutes = require('./routes/category');
const linkRoutes = require('./routes/link');

// App middlewares
app.use(morgan('dev'));
app.use(bodyparser.json({ limit: '5mb', type: 'application/json' }));
app.use(cors({ origin: process.env.CLIENT_URL }));

// Middlewares
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', categoryRoutes);
app.use('/api', linkRoutes);

// Socket.IO Configuration // Import the Message model

// Socket.IO Configuration
io.on('connection', async (socket) => {
  console.log('a user connected');

  try {
      const previousMessages = await Message.find().lean(); // Fetch previous messages
      socket.emit('load_messages', previousMessages); // Emit the previous messages to the new client
  } catch (err) {
      console.error('Error loading messages:', err);
  }

  socket.on('send_message', async (message) => {
      console.log('Message received:', message);

      // Save the message to the database
      try {
          const newMessage = new Message(message);
          await newMessage.save(); // Use async/await to save the message
          io.emit('receive_message', message); // Emit the message to all clients
      } catch (err) {
          console.error('Error saving message:', err);
      }
  });

  socket.on('disconnect', () => {
      console.log('user disconnected');
  });
});




// Start the server
const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`App is running on port ${port}`));
