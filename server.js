const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
const http = require('http');
const socketIo = require('socket.io');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://antares-calls-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.firestore();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Real-time updates with Socket.io
io.on('connection', (socket) => {
  console.log('New client connected');

  const checkInsRef = db.collection('checkIns');
  checkInsRef.onSnapshot((snapshot) => {
    const checkIns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    socket.emit('checkIns', checkIns);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Routes
app.get('/api/checkins', async (req, res) => {
  try {
    const checkInsSnapshot = await db.collection('checkIns').get();
    const checkIns = checkInsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(checkIns);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post('/api/checkins', async (req, res) => {
  try {
    const { room, checkInTime, comments, calledBy } = req.body;
    const newCheckIn = { room, checkInTime, comments, calledBy, solvedStatus: 'Not Solved' };
    const docRef = await db.collection('checkIns').add(newCheckIn);
    res.json({ id: docRef.id, ...newCheckIn });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.put('/api/checkins/:id', async (req, res) => {
  try {
    const { comments, calledBy, solvedStatus } = req.body;
    const updatedCheckIn = { comments, calledBy, solvedStatus };
    await db.collection('checkIns').doc(req.params.id).update(updatedCheckIn);
    res.json({ id: req.params.id, ...updatedCheckIn });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.delete('/api/checkins/:id', async (req, res) => {
  try {
    await db.collection('checkIns').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Route to delete all check-ins
app.delete('/api/checkins', async (req, res) => {
  try {
    const batch = db.batch();
    const checkInsSnapshot = await db.collection('checkIns').get();
    checkInsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Serve static files (your HTML, CSS, and JS)
app.use(express.static('public'));

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
