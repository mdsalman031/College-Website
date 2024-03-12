const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const xlsx = require('xlsx');
const mysql = require('mysql2');
const { promisify } = require('util');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');

const moment = require('moment');
const { log } = require('console');

const app = express();
const port = 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.options('*', cors());
app.use((req, res, next) => {
    const allowedOrigins = ['http://localhost:3000', 'http://192.168.56.1:3000'];
    const origin = req.headers.origin;



    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS','DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});
app.use(cors());

app.use(bodyParser.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'salman@031',
    database: 'collegegpt',
    waitForConnections: true
});

pool.getConnection((err,results)=>{
  if(err){
    console.log('Error connecting to Database:',err);
  }
  else{
    console.log('Database Connected successfully');
  }
})

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const excelData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);


        for (const row of excelData) {
            const formattedDate = formatExcelDate(row['Date of Birth']);
            console.log('Formatted Date:', formattedDate);

            // Insert into student_details table
             const query = 'INSERT INTO student_details (s_id, sname, DOB, s_father, phone_no, address, semester, department, aadhaar, email) VALUES (?, ?, ?,?,?,?,?,?,?,?)';
             pool.query(query, [
                row.Pin,
                row.Name,
                formattedDate,
                row['Father Name'],
                row['Mobile no'],
                row.Address,
                row.semester,
                row.Department,
                row.Aadhaar,
                row['Email id'],
            ],(err,result)=>{
              if(err){
                console.log('Error adding student:',err);
              }
              else{
                console.log('Added successfully');              
               // Insert into attendance table
                pool.query('INSERT INTO attendance (s_id) VALUES (?)', [row.Pin],(err,result)=>{
                  if(err){
                    console.log('Error adding into Attendance');
                  }
                  else{
                    res.status(200).send('Data imported successfully!');
                  }
                });
              }
            });
        }
    } catch (error) {
        console.error('Error processing Excel file:', error);
        res.status(500).send('Internal server error');
    }
});

function formatExcelDate(dateString) {
    if (!dateString) {
        console.log('Date String is empty or undefined.');
        return null;
    }

    console.log('Original Date String:', dateString);

    const formats = ['MM/DD/YY', 'M/D/YY'];
    for (const format of formats) {
        const parsedDate = moment(dateString, format, true);
        console.log(`Parsing with format ${format}:`, parsedDate.isValid());
        
        if (parsedDate.isValid()) {
            return parsedDate.format('YYYY-MM-DD');
        }
    }

    console.log('Date could not be parsed with any format.');
    return null;
}

app.get('/getstudents', async (req, res) => {
    try {
        // Extract semester and department from the request query parameters
        const { semester, department } = req.query;

        // Log the received parameters for debugging
        console.log('Semester:', semester);
        console.log('Department:', department);

        // Construct the SQL query using UNION between the two tables
        const q = 'SELECT * FROM student_details WHERE s_id LIKE ? AND department = ? UNION SELECT * FROM completed_students WHERE s_id LIKE ? AND department = ?';
        pool.query(q, [`%${semester}%`, department, `%${semester}%`, department], (err, result) =>{
          if(err){
            console.log('Student Details:',err);
          }
          else{
            console.log(result);
            
            // Send the result as a JSON response
            res.status(200).json(result || []);
          }
        })

        // Log that the query execution has completed
        console.log('SQL query execution completed.');

    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'Unexpected error fetching student details', details: error.message });
    }
});

app.put('/editstudent/:studentId', (req, res) => {
    const { studentId } = req.params;
    const updatedDetails = req.body;
    
    const query = `UPDATE student_details SET ? WHERE s_id = ?`;
  
    pool.query(query, [updatedDetails, studentId], (error) => {
      if (error) {
        console.error('Error updating student', error);
        res.status(500).json({ error: 'Error updating student' });
      } else {
        res.status(200).json({ message: 'Student updated successfully' });
      }
    });
  });
  
// Delete Student Route
app.delete('/deletestudent/:id', async (req, res) => {
    const studentId = req.params.id;
    // console.log(studentId);
    try {
      // MySQL query to delete the student with the provided ID
      const sql = 'DELETE FROM student_details WHERE s_id = ?';
  
      // Use the connection pool to execute the query
      
      pool.query(sql, [studentId],(err,result)=>{
        if(err){
           console.log("error in deleting students",err);
        }
        else{    
        console.log('Student deleted successfully');
        res.status(200).send('Student deleted successfully');
        }     
     });

    } catch (err) {
      console.error('Error deleting student:', err);
      res.status(500).send('Error deleting student');
    }
  });

app.post('/processSixthSemester', async (req, res) => {
    try {
        console.log('Received a request to process sixth-semester students');

        // Define the SQL query to move sixth-semester students to a new table
        const moveQuery = 'INSERT INTO completed_students SELECT * FROM student_details WHERE semester = 6';

        pool.query(moveQuery,[],(err,result)=>{
          if(err){
            console.log("Error in processing");
          }
          else{
                // Define the SQL query to delete sixth-semester students from the current table
               const deleteQuery = 'DELETE FROM student_details WHERE semester = 6';
               pool.query(deleteQuery,[],(err,result)=>{
                if(err){
                  console.log("Error in deleting students",err);
                }
                else{
                  res.status(200).json({ message: 'Sixth-semester students processed successfully!' });
                  console.log("Students Added");
                }
               })
          }
        })

    } catch (error) {
        console.error('Error processing sixth-semester students:', error);
        res.status(500).json({ error: 'Error processing sixth-semester students', details: error.message });
    }
});

app.post('/api/updateAllSemesters', async (req, res) => {
    try {
      const updateQuery = `
        UPDATE student_details
        SET semester = CASE
          WHEN semester < 6 THEN semester + 1
          ELSE semester
        END;
      `;
      
      // Execute the update query
      pool.query(updateQuery,[],(err,results)=>{
        if(err){
          console.log('Error in updating:',err);
        }
        else{
         console.log('Updated successfully');
         res.json({ message: 'All student semesters updated successfully.' });
        }
      });
    } catch (error) {
      console.error('Error updating student semesters:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL');
        connection.release();
    }
});

// Sathwik-------------------------------------------------------------------------------------------------------------

let storedDepartment;
let storedSemester;
let storedSubject;
let storedShift;

app.route('/api/student_details')
  .post((req, res) => {
    const { department, semester ,subject,shift} = req.body;
    console.log('Received data:', { department, semester ,subject,shift});

    // Store the department and semester details for later retrieval
    storedDepartment = department;
    storedSemester = semester;
    storedSubject = subject;
    storedShift = shift;
    let query ;
    console.log(storedShift);
    if(storedShift=='1')
        query = "select * from student_details where CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(s_id,'-',-1),'-',1) AS SIGNED )<=60 AND department=? HAVING semester=?";
    else
        query = "select * from student_details where CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(s_id,'-',-1),'-',1) AS SIGNED )>60 AND department=? HAVING semester=?";
    pool.query(query,[department, semester],(err, results) => {
        if (err) {
          console.error('Error querying MySQL:', err);
          res.status(500).send('Internal Server Error');
          return;
        }
        res.json(results);
      }
    );
  })

  .get((req, res) => {
    // Use the stored department and semester details for the GET request
    console.log('Retrieving data for department and semester:', { storedDepartment, storedSemester });

    // Query the database using the stored details
    let query ;
    console.log(storedShift);
    if(storedShift=='1')
        query = "select * from student_details where CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(s_id,'-',-1),'-',1) AS SIGNED )<=60 AND department=? HAVING semester=?";
    else
        query = "select * from student_details where CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(s_id,'-',-1),'-',1) AS SIGNED )>60 AND department=? HAVING semester=?";
    pool.query(query,[storedDepartment, storedSemester],(err, results) =>{
        if (err) {
          console.error('Error querying MySQL:', err);
          res.status(500).send('Internal Server Error');
          return;
        }
        res.json(results);
      }
    );
  });

app.get('/api/departments', (req, res) => {
  pool.query('SELECT * FROM department', (err, results) => {
    if (err) {
      console.error('Error querying MySQL:', err);
      res.status(500).send('Internal Server Error');
      return;
    }
    res.json(results);
    console.log('Received Departments');
  });
});

// Function to retrieve attendance data based on date range and studentId
const getAttendanceData = (startDate, endDate, studentId, callback) => {
  console.log('Executing getAttendanceData function');
  console.log('startDate:', startDate);
  console.log('endDate:', endDate);
  console.log('studentId:', studentId);
  const dateColumns = [];
  const currentDate = new Date(startDate);
  while (currentDate <= new Date(endDate)) {
    const day = currentDate.getDate().toString().padStart(2, '0');
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const year = currentDate.getFullYear();
    const formattedDate = `${day}_${month}_${year}`;
    dateColumns.push(`\`${formattedDate}\``);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const selectColumns = ['s_id', ...dateColumns].join(', ');
  let query;
  if(!startDate && !endDate){
      query = `SELECT * FROM attendance  WHERE s_id = ? `;
  }
  else{
    query = `SELECT ${selectColumns} FROM attendance  WHERE s_id = ? `;
  }
  console.log(query);
  pool.query(query, [studentId], (err, results) => {
    if (err) {
      console.error('Error executing MySQL query:', err);
      callback(err, null);
    } else {
      callback(null, results);
    }
  });
};

app.get('/api/attendance', (req, res) => {
  console.log('Received request with parameters:', req.query);
  const { startDate, endDate, studentId } = req.query;
  if (!studentId) {
    return res.status(400).json({ error: 'Bad Request: Missing required parameters' });
  }
  getAttendanceData(startDate, endDate, studentId, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(results);
    }
  });
});
 
app.post('/api/submit_attendance', async (req, res) => {
  const { attendanceStatusArray } = req.body;
  const sem = storedSemester+storedDepartment+storedShift;
  const newColumnName = storedSubject;

  try {
    const s_ids = await getStudentIdsFromDatabase();
    const tableCreated = await createSubjectStatusTable(sem);
    
    if (tableCreated) {
      await insertSubjectStatus(sem, s_ids);
    }
    
    await updateSubjectStatusTable(sem, newColumnName, attendanceStatusArray, s_ids);

    res.json({ message: 'Attendance status array received successfully' });
  } catch (error) {
    console.error('Error processing attendance:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

async function getStudentIdsFromDatabase() {
  return new Promise((resolve, reject) => {
    let query ;
    console.log(storedShift);
    if(storedShift=='1')
        query = "select * from student_details where CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(s_id,'-',-1),'-',1) AS SIGNED )<=60 AND department=? HAVING semester=? order by s_id";
    else
        query = "select * from student_details where CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(s_id,'-',-1),'-',1) AS SIGNED )>60 AND department=? HAVING semester=? order by s_id";
    pool.query(query, [storedDepartment,storedSemester], (err, result) => {
      if (err) {
        console.error('Error retrieving student IDs:', err);
        reject(err);
      } else {
        const studentIds = result.map((row) => row.s_id);
        resolve(studentIds);
      }
    });
  });
}

function createSubjectStatusTable(sem) {
  return new Promise((resolve, reject) => {
    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${sem} (s_id varchar(12) primary key)`;
    pool.query(createTableQuery, [], (err, result) => {
      if (err) {
        console.log(`Error creating ${sem} table:`, err);
        reject(err);
      } else {
        const tableCreated = result.warningStatus === 0; // Check if table was created
        if (tableCreated) {
          console.log(`${sem} table created successfully.`);
        } else {
          console.log(`${sem} table already exists.`);
        }
        resolve(tableCreated);
      }
    });
  });
}

function insertSubjectStatus(sem, s_ids) {
  return new Promise((resolve, reject) => {
    sem=storedSemester+storedDepartment+storedShift;
    const createTableQuery = 'INSERT INTO '+sem+' (s_id) VALUES ?';
        const values = s_ids.map((s_id) => [s_id]);
        pool.query(createTableQuery, [values], (err, result) => {
          if (err) {
            console.log(`Error inserting into ${sem} for ${sem}`, err);
            reject(err);
          } else {
            console.log(`${sem} data inserted successfully.`);
            resolve(result);
          }
        });
  });
}

function updateSubjectStatusTable(sem, newColumnName, newValues, s_ids) {
  return new Promise((resolve, reject) => {
    const alterTableQuery = `ALTER TABLE ${sem} ADD COLUMN ${newColumnName} VARCHAR(1)`;
    pool.query(alterTableQuery, [], (err, result) => {
      if (err) {
        console.log(`Error adding column into table:`, err);
        reject(err);
      } else {
        console.log(`${newColumnName} added into ${sem} successfully.`);
        if (newValues && newValues.length > 0) {
          const valuePlaceholders = newValues.map(() => '?').join(', ');
          const updateQuery = `UPDATE ${sem} SET ${newColumnName} = CASE ${s_ids
            .map((s_id, index) => `WHEN s_id = '${s_id}' THEN ?`)
            .join(' ')} END`;

          pool.query(updateQuery, newValues, (updateErr, updateResult) => {
            if (updateErr) {
              console.log(`Error updating ${sem} table with new values:`, updateErr);
              reject(updateErr);
            } else {
              console.log(`Table ${sem} updated with new values successfully.`);
              resolve(updateResult);
            }
          });
        } else {
          resolve(result);
        }
      }
    });
  });
}

app.post('/api/date_attendance', (req, res) => {
  const { attendanceDate } = req.body;

  if (!attendanceDate) {
    return res.status(400).json({ error: 'Missing attendance date in the request.' });
  }

  console.log('Received attendance date:', attendanceDate);

  const date = formatDate(attendanceDate);
  console.log('Formatted date:', date);
  console.log('Department:', storedDepartment, 'Semester:', storedSemester);

  // Get student IDs from the database
  getStudentIdsFromDatabase((err, s_ids, sem) => {
    if (err) {
      console.error('Error getting student IDs:', err);
    } else {
      // Call functions with retrieved student IDs from sem table
      updateAttendanceTable(sem, date, s_ids);
      console.log(s_ids);
    }
  });

  // Function to get student IDs from the database with parameterized query
  function getStudentIdsFromDatabase(callback) {
    const sem = storedSemester + storedDepartment+storedShift;
    console.log(sem);
    const query = 'SELECT s_id FROM ' + sem;
    pool.query(query, [], (err, result) => {
      if (err) {
        console.error('Error retrieving student IDs:', err);
        res.json({ message: 'Table does not exists.' });
        callback(err, null);
      } else {
        const studentIds = result.map(row => row.s_id);
        callback(null, studentIds, sem);
      }
    });
  }

  async function updateAttendanceTable(sem, dateColumnName, s_ids) {
    const query = 'SELECT * FROM ' + sem;
    pool.query(query, [], (err, result) => {
      if (err) {
        console.error('Error retrieving student status:', err);
        res.json({ message: 'Table not exists.' });
      } else {
        const records = result.map(row => {
          const { s_id, ...valuesWithoutSId } = row;
          return Object.values(valuesWithoutSId);
        });

        const alterTableQuery = `ALTER TABLE attendance ADD COLUMN ${dateColumnName} VARCHAR(1) DEFAULT '-'`;
        pool.query(alterTableQuery, [], (err, result) => {
          if (err) {
            console.log('Error in adding to attendance:', err);
            res.json({ message: 'Datecolumn already exists.' });
          } else {
            console.log(dateColumnName, 'successfully added into attendance');
            s_ids.forEach((s_id, index) => {
              if (!records[index]) {
                console.log(`No records found for student ${s_id}`);
                return;
              }
              const allPresent = records[index].every(status => status === 'P');
              const st = allPresent ? 'P' : 'A';
              const updateQuery = `UPDATE attendance SET ${dateColumnName} = ? where s_id = ?`;
              const updateParams = [st, s_id];
              pool.query(updateQuery, updateParams, (updateErr, updateResult) => {
                if (updateErr) {
                  console.log('Error in adding attendance:', updateErr);
                  res.json({ message: 'Attendance not updated.' });
                } else {
                  console.log('Successfully added attendance ' + dateColumnName);
                }
              });
            });
            const query = 'DROP TABLE ' + sem;
            pool.query(query, [], (err, result) => {
              if (err) {
                console.log('error');
              } else {
                res.json({ message: 'Attendance date received successfully.' });
                console.log('deleted ' + sem);
              }
            });
          }
        });
      }
    });
  }
});


app.post('/api/holiday_attendance',(req,res) => {
   const {holidayType,holidayDate} = req.body;
   const date = formatDate(holidayDate);
   const query='Alter table attendance add column '+date+' varchar(1) default "'+holidayType+'"';
   pool.query(query,[],(err,result)=>{
    if(err){
      console.log('Error adding Holiday:',err);
      res.status(500).send('Internal Server Error');
    }
    else{
      res.json(result);
      console.log(date+' Attendance Added successfully');
    }
   })
});
function formatDate(inputDate) {
  const dateObject = new Date(inputDate);
  const day = String(dateObject.getDate()).padStart(2, '0');
  const month = String(dateObject.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = dateObject.getFullYear();

  return `${day}_${month}_${year}`;
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


