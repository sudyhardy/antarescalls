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
    .then(() => {
        console.log('MongoDB connected...');
        setupChangeStream();
    })
    .catch(err => console.log('Error connecting to MongoDB:', err));

// Create a schema and model for check-ins
const checkInSchema = new mongoose.Schema({
    room: String,
    checkInTime: Date,
    comments: String,
    calledBy: String,
    solvedStatus: {
        type: String,
        enum: ['Solved', 'Not Solved'],
        default: 'Not Solved'
    }
});

const CheckIn = mongoose.model('CheckIn', checkInSchema);

// Function to setup Change Stream
function setupChangeStream() {
    const db = mongoose.connection.db;
    const checkinsCollection = db.collection('checkins');

    const changeStream = checkinsCollection.watch();

    changeStream.on('change', (change) => {
        switch (change.operationType) {
            case 'insert':
                io.emit('checkInAdded', change.fullDocument);
                break;
            case 'update':
                io.emit('checkInUpdated', { id: change.documentKey._id, ...change.updateDescription.updatedFields });
                break;
            case 'delete':
                io.emit('checkInDeleted', change.documentKey._id);
                break;
            default:
                console.log(`Unhandled change type: ${change.operationType}`);
        }
    });
}

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    socket.on('playAlertSound', (id) => {
        io.emit('playAlertSound', id);
    });
    // You can add more socket events here as needed.
});

// Routes
app.get('/api/checkins', async (req, res) => {
    try {
        const checkIns = await CheckIn.find();
        res.json(checkIns);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch check-ins' });
    }
});

app.post('/api/checkins', async (req, res) => {
    try {
        const { room, checkInTime, comments, calledBy } = req.body;
        let checkIn = await CheckIn.findOne({ room });

        if (checkIn) {
            // Update existing check-in
            checkIn.checkInTime = checkInTime;
            checkIn.comments = comments;
            checkIn.calledBy = calledBy;
            await checkIn.save();

            // Broadcast the event to all connected clients
            io.emit('checkInUpdated', checkIn);
            res.json(checkIn);
        } else {
            // Create new check-in
            checkIn = new CheckIn({ room, checkInTime, comments, calledBy });
            await checkIn.save();

            // Broadcast the event to all connected clients
            io.emit('newCheckIn', checkIn);
            io.emit('playAlertSound', checkIn._id); // Emit alert sound event to all clients
            res.json(checkIn);
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to add or update check-in' });
    }
});


app.put('/api/checkins/:id', async (req, res) => {
    try {
        const { comments, calledBy, solvedStatus } = req.body;
        const updatedCheckIn = await CheckIn.findByIdAndUpdate(
            req.params.id,
            { comments, calledBy, solvedStatus },
            { new: true }
        );

        // Broadcast the event to all connected clients
        io.emit('checkInUpdated', updatedCheckIn);

        res.json(updatedCheckIn);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update check-in' });
    }
});




app.delete('/api/checkins/:id', async (req, res) => {
    try {
        await CheckIn.findByIdAndDelete(req.params.id);

        // Broadcast the event to all connected clients
        io.emit('deleteCheckIn', req.params.id);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete check-in' });
    }
});

app.delete('/api/checkins', async (req, res) => {
    try {
        await CheckIn.deleteMany({});

        // Broadcast the event to all connected clients
        io.emit('clearAllCheckIns');

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear check-ins' });
    }
});


// Serve static files (your HTML, CSS, and JS)
app.use(express.static('public'));

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
