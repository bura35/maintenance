const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Use dynamic port for Render or fallback to 3000 locally

// Load SSL Certificates (only needed for local development)
let credentials;
if (fs.existsSync('key.pem') && fs.existsSync('cert.pem')) {
    const privateKey = fs.readFileSync('key.pem', 'utf8');
    const certificate = fs.readFileSync('cert.pem', 'utf8');
    credentials = { key: privateKey, cert: certificate };
}

// Middleware
app.use(express.json()); // Parse JSON body
app.use(cors()); // Allow cross-origin requests

// Initialize SQLite Database
const db = new sqlite3.Database('./maintenance.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Ensure the database table exists
db.run(
    `CREATE TABLE IF NOT EXISTS maintenance_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant TEXT,
        date TEXT,
        maintenanceType TEXT,
        issue TEXT,
        replacedParts TEXT,
        waitingTime INTEGER,
        repairTime INTEGER,
        actions TEXT,
        remarks TEXT
    )`,
    (err) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Table "maintenance_reports" ensured.');
        }
    }
);

// Serve the frontend HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle form submission
app.post('/submit', (req, res) => {
    const {
        plant,
        date,
        maintenanceType,
        issue,
        replacedParts,
        waitingTime,
        repairTime,
        actions,
        remarks,
    } = req.body;

    // Log the incoming data for debugging
    console.log('Received data:', req.body);

    // Validation: Ensure required fields are not empty
    if (!plant || !date || !maintenanceType || !issue) {
        console.error('Error: Missing required fields.');
        return res.status(400).json({ message: 'Required fields (plant, date, maintenanceType, issue) are missing.' });
    }

    // Insert data into the database
    db.run(
        `INSERT INTO maintenance_reports (plant, date, maintenanceType, issue, replacedParts, waitingTime, repairTime, actions, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [plant, date, maintenanceType, issue, replacedParts, waitingTime, repairTime, actions, remarks],
        (err) => {
            if (err) {
                console.error('Error inserting data into database:', err);
                res.status(500).json({ message: 'Failed to save data to the database.' });
            } else {
                console.log('Data inserted successfully:', req.body);
                res.status(200).json({ message: 'Data submitted successfully!' });
            }
        }
    );
});

// Error handling for invalid routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found.' });
});

// Start HTTPS server or regular HTTP server if no SSL credentials are present
if (credentials) {
    const httpsServer = https.createServer(credentials, app);
    httpsServer.listen(PORT, () => {
        console.log(`Server is running on https://localhost:${PORT}`);
    });
} else {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
