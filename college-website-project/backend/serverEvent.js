// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/FacultyManagement', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
  });

// Create a schema for events
const eventSchema = new mongoose.Schema({
  date: String,
  eventName: String,
  eventDescription: String,
});

// Create a model based on the schema
const Event = mongoose.model('Event', eventSchema);

// API endpoint to get events
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find();
    res.setHeader('Content-Type', 'application/json');
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// API endpoint to add an event
app.post('/api/events', async (req, res) => {
  const { date, eventName, eventDescription } = req.body;

  try {
    const newEvent = new Event({ date, eventName, eventDescription });
    await newEvent.save();
       // Set the content type header to JSON
       res.setHeader('Content-Type', 'application/json');
    res.json(newEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// API endpoint to delete an event
app.delete('/api/events/:id', async (req, res) => {
  const eventId = req.params.id;

  try {
    await Event.findByIdAndDelete(eventId);
    res.setHeader('Content-Type', 'application/json');
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
