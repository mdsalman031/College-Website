const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'salman@031',
    waitForConnections: true
});

// Define your database and table creation queries
const createDatabaseQuery = 'CREATE DATABASE IF NOT EXISTS sample';
const useDatabaseQuery = 'USE sample';
const createDepartmentTableQuery = `
CREATE TABLE IF NOT EXISTS department (
    D_id int NOT NULL AUTO_INCREMENT,
    D_name varchar(10) DEFAULT NULL,
    PRIMARY KEY (D_id),
    KEY depart (D_name)
)`;

const createStudentTableQuery = `
CREATE TABLE IF NOT EXISTS student_details (
    s_id varchar(12) NOT NULL,
    sname char(20) DEFAULT NULL,
    DOB date DEFAULT NULL,
    s_father char(20) DEFAULT NULL,
    phone_no bigint unsigned DEFAULT NULL,
    address varchar(225) DEFAULT NULL,
    email varchar(25) DEFAULT NULL,
    aadhaar varchar(12) DEFAULT NULL,
    semester int DEFAULT NULL,
    department varchar(10) DEFAULT NULL,
    PRIMARY KEY (s_id),
    UNIQUE KEY aadhaar (aadhaar),
    KEY department (department),
    CONSTRAINT student_details_fk_1 FOREIGN KEY (department) REFERENCES department (D_name),
    CONSTRAINT s_id_check CHECK (s_id REGEXP '^[0-9]{5}-[a-zA-Z]{2}-[0-9]{3}$'),
    CONSTRAINT phone_no_check CHECK (phone_no REGEXP '^[0-9]{10}$'),
    CONSTRAINT email_check CHECK (email REGEXP '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,4}$'),
    CONSTRAINT aadhaar_check CHECK (aadhaar REGEXP '^[0-9]{12}$'),
    CONSTRAINT semester_check CHECK (semester REGEXP '^[1-6]{1}$')
)`;

const createCompletedStudentTableQuery = `
CREATE TABLE IF NOT EXISTS completed_students (
    s_id varchar(12) NOT NULL,
    sname char(20) DEFAULT NULL,
    DOB date DEFAULT NULL,
    s_father char(20) DEFAULT NULL,
    phone_no bigint unsigned DEFAULT NULL,
    address varchar(225) DEFAULT NULL,
    email varchar(25) DEFAULT NULL,
    aadhaar varchar(12) DEFAULT NULL,
    semester int DEFAULT NULL,
    department varchar(10) DEFAULT NULL,
    PRIMARY KEY (s_id),
    UNIQUE KEY aadhaar (aadhaar),
    KEY department (department),
    CONSTRAINT complete_studentdetails_fk_1 FOREIGN KEY (department) REFERENCES department (D_name),
    CONSTRAINT cs_s_id_check CHECK (s_id REGEXP '^[0-9]{5}-[a-zA-Z]{2}-[0-9]{3}$'),
    CONSTRAINT cs_phone_no_check CHECK (phone_no REGEXP '^[0-9]{10}$'),
    CONSTRAINT cs_email_check CHECK (email REGEXP '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,4}$'),
    CONSTRAINT cs_aadhaar_check CHECK (aadhaar REGEXP '^[0-9]{12}$'),
    CONSTRAINT cs_semester_check CHECK (semester REGEXP '^[1-6]{1}$')
)`;

const createAttendanceQuery = `
CREATE TABLE IF NOT EXISTS attendance (
    s_id varchar(12) DEFAULT NULL,
    KEY s_id (s_id),
    CONSTRAINT attendance_s_id_fk FOREIGN KEY (s_id) REFERENCES student_details (s_id) ON DELETE CASCADE
)`;

// Execute the queries sequentially
pool.query(createDatabaseQuery, (err) => {
    if (err) {
        console.error('Error creating database:', err);
    } else {
        console.log('Database created successfully or already exists');
        // Now, use the database and create the tables
        pool.query(useDatabaseQuery, (err) => {
            if (err) {
                console.error('Error using database:', err);
            } else {
                console.log('Using database: sample');
                // Create the department table
                pool.query(createDepartmentTableQuery, (err) => {
                    if (err) {
                        console.error('Error creating department table:', err);
                    } else {
                        console.log('Department table created successfully or already exists');
                        // Create the student_details table
                        pool.query(createStudentTableQuery, (err) => {
                            if (err) {
                                console.error('Error creating student_details table:', err);
                            } else {
                                console.log('Student_details table created successfully or already exists');
                                // Create the completed_students table
                                pool.query(createCompletedStudentTableQuery, (err) => {
                                    if (err) {
                                        console.error('Error creating completed_students table:', err);
                                    } else {
                                        console.log('Completed_students table created successfully or already exists');
                                        // Create the attendance table
                                        pool.query(createAttendanceQuery, (err) => {
                                            if (err) {
                                                console.error('Error creating attendance table:', err);
                                            } else {
                                                console.log('Attendance table created successfully or already exists');
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }
});
