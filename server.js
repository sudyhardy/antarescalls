const functions = require('firebase-functions');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb+srv://antares:Antareslaan10@antares.tnemt.mongodb.net/?retryWrites=true&w=majority&appName=antares')
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));

// Create a schema and model for check-ins
const checkInSchema = new mongoose.Schema({
    room: String,
    checkInTime: Date,
    comments: String,     // Add comments field
    calledBy: String,      // Add calledBy field
    solvedStatus: {       // Add solvedStatus field
        type: String,
        enum: ['Solved', 'Not Solved'],
        default: 'Not Solved' // Default to 'Not Solved'
    }
});

const CheckIn = mongoose.model('CheckIn', checkInSchema);

// Socket.io connection
io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

// Routes
app.get('/api/checkins', async (req, res) => {
    const checkIns = await CheckIn.find();
    res.json(checkIns);
});

app.post('/api/checkins', async (req, res) => {
    const { room, checkInTime, comments, calledBy } = req.body;
    const newCheckIn = new CheckIn({ room, checkInTime, comments, calledBy });
    await newCheckIn.save();

    // Broadcast the event to all connected clients
    io.emit('checkInAdded', newCheckIn);

    res.json(newCheckIn);
});

app.put('/api/checkins/:id', async (req, res) => {
    const { comments, calledBy, solvedStatus } = req.body; // Include solvedStatus in the destructuring
    const updatedCheckIn = await CheckIn.findByIdAndUpdate(
        req.params.id,
        { comments, calledBy, solvedStatus }, // Add solvedStatus to the update object
        { new: true }
    );

    // Broadcast the event to all connected clients
    io.emit('checkInUpdated', updatedCheckIn);

    res.json(updatedCheckIn);
});

app.delete('/api/checkins/:id', async (req, res) => {
    await CheckIn.findByIdAndDelete(req.params.id);

    // Broadcast the event to all connected clients
    io.emit('checkInDeleted', req.params.id);

    res.json({ success: true });
});

// Route to delete all check-ins
app.delete('/api/checkins', async (req, res) => {
    await CheckIn.deleteMany({});

    // Broadcast the event to all connected clients
    io.emit('checkInsCleared');

    res.json({ success: true });
});

// Serve static files (your HTML, CSS, and JS)
app.use(express.static('public'));
exports.api = functions.https.onRequest(app);
// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
