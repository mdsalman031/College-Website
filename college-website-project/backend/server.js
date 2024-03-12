const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors'); // Import the 'cors' package
const Faculty = require('./models/Faculty');

const app = express();
const PORT = process.env.PORT || 5001;

// Use the 'cors' middleware
app.use(cors());

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

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.json());

app.get('/api/faculty/download-template', (req, res) => {
  const templateData = [
    ['PIN', 'biometricID', 'name', 'department', 'degree', 'experience', 'mobile', 'email'],
  ];

  const ws = xlsx.utils.aoa_to_sheet(templateData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Faculty Template');

  const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' }); // Corrected this line

  res.setHeader('Content-Disposition', 'attachment; filename=faculty_template.xlsx');
  res.type('application/octet-stream').send(buffer);
});

// Endpoint to add faculty
app.post('/api/faculty/add-faculty', upload.single('facultyFile'), async (req, res) => {
    try {
      const fileBuffer = req.file.buffer;
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const facultyData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  
      // Insert faculty data into the database
      await Faculty.insertMany(facultyData);
  
      res.status(200).send('Faculty data added successfully!');
      console.log('Faculty Data:', facultyData);
    } catch (error) {
      console.error('Error adding faculty:', error);
      res.status(500).send('Error adding faculty. Please try again.');
    }
  });

  // Endpoint to remove faculty by PIN
app.delete('/api/faculty/remove-faculty/:pin', async (req, res) => {
    const { pin } = req.params;
    try {
      await Faculty.deleteOne({ PIN: pin });
      res.status(200).send(`Faculty with PIN ${pin} removed successfully!`);
    } catch (error) {
      console.error('Error removing faculty:', error);
      res.status(500).send('Error removing faculty. Please try again.');
    }
  });
  
  // Endpoint to get all faculty
app.get('/api/faculty/get-faculty', async (req, res) => {
    try {
      // Fetch all faculty data from the database
      const facultyData = await Faculty.find();
      res.status(200).json(facultyData);
    } catch (error) {
      console.error('Error getting faculty data:', error);
      res.status(500).send('Error getting faculty data. Please try again.');
    }
  });

  // Endpoint to update faculty by PIN
    app.put('/api/faculty/update-faculty/:pin', async (req, res) => {
    const { pin } = req.params;
    const updatedFacultyData = req.body;
  
    try {
      // Update the faculty with the specified PIN
      await Faculty.updateOne({ PIN: pin }, { $set: updatedFacultyData });
  
      res.status(200).send(`Faculty with PIN ${pin} updated successfully!`);
    } catch (error) {
      console.error('Error updating faculty:', error);
      res.status(500).send('Error updating faculty. Please try again.');
    }
  });
  
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
