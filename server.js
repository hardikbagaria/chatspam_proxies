// server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { broadcastMessage, count, startBots } from './bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

startBots();

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.emit('botCount', count()); // Send initial bot count
    
    socket.on('sendMessage', (message) => {
        console.log(`Received message: ${message}`);
        broadcastMessage(message);
    });
    
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

setInterval(() => {
    io.emit('botCount', count()); // Update bot count periodically
}, 5000);

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
