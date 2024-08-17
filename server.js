const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb+srv://antares:Antareslaan10@antares.jgkbj.mongodb.net/?retryWrites=true&w=majority&appName=antares')
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

// Routes
app.get('/api/checkins', async (req, res) => {
    const checkIns = await CheckIn.find();
    res.json(checkIns);
});

app.post('/api/checkins', async (req, res) => {
    const { room, checkInTime, comments, calledBy } = req.body;
    const newCheckIn = new CheckIn({ room, checkInTime, comments, calledBy });
    await newCheckIn.save();
    res.json(newCheckIn);
});

app.put('/api/checkins/:id', async (req, res) => {
    const { comments, calledBy, solvedStatus } = req.body; // Include solvedStatus in the destructuring
    const updatedCheckIn = await CheckIn.findByIdAndUpdate(
        req.params.id,
        { comments, calledBy, solvedStatus }, // Add solvedStatus to the update object
        { new: true }
    );
    res.json(updatedCheckIn);
});

app.delete('/api/checkins/:id', async (req, res) => {
    await CheckIn.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// Route to delete all check-ins
app.delete('/api/checkins', async (req, res) => {
    await CheckIn.deleteMany({});
    res.json({ success: true });
});

// Serve static files (your HTML, CSS, and JS)
app.use(express.static('public'));

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
