// server.js
const express = require('express');
const mysql = require('mysql');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3123;

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

const con = mysql.createConnection({
  host: 'localhost',
  user: 'leo',
  password: 'leo',
  database: 'slots'
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));


app.get('/api/slots', (req, res) => {
  con.query('SELECT * FROM slots', function (err, result) {
    if (err) throw err;
    res.status(201).json(result);
  });
});

app.get('/api/available', (req, res) => {
  con.query('SELECT s.id, s.time FROM slots s LEFT JOIN reservations r ON s.id = r.slotid WHERE r.slotid IS NULL', function (err, result) {
    if (err) throw err;
    formatResult = result.map(slot => {
      return {
        id: slot.id,
        date: slot.time.toLocaleDateString(),
        time: slot.time.toLocaleTimeString()
      };
    });
    res.status(201).json(formatResult);
  });
});

app.get('/api/available/:date', (req, res) => {
  // get available slots for a specific date (YYYY-MM-DD)
  const date = req.params.date;
  con.query('SELECT s.id, s.time FROM slots s LEFT JOIN reservations r ON s.id = r.slotid WHERE r.slotid IS NULL AND DATE(s.time) = ?', [date], function (err, result) {
    if (err) throw err;
    formatResult = result.map(slot => {
      return {
        id: slot.id,
        date: slot.time.toLocaleDateString(),
        time: slot.time.toLocaleTimeString()
      };
    });
    res.status(201).json(formatResult);
  });
});

app.get('/api/available-dates', (req, res) => {
  con.query('SELECT DISTINCT DATE(time) as date FROM slots s LEFT JOIN reservations r ON s.id = r.slotid WHERE r.slotid IS NULL', function (err, result) {
    if (err) throw err;
    const formatResult = result.map(slot => {
      // Ensure date is in yyyy-mm-dd format
      const date = new Date(slot.date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
    res.status(200).json({ dates: formatResult });
  });
});

app.post('/api/reserve', (req, res) => {
  const slotid = req.body.slotid;
  const email = req.body.email;
  // check if slot is available
  con.query('SELECT * FROM reservations WHERE slotid = ?', [slotid], function (err, result) {
    if (err) throw err;
    if (result.length > 0) {
      res.status(400).json({ message: 'Slot not available' });
      return;
    }
  });
  con.query('INSERT INTO reservations (slotid, email) VALUES (?, ?)', [slotid, email], function (err, result) {
    if (err) throw err;
    res.status(201).json({ message: 'Slot reserved!' });
  });
});

app.get('/api/reservations', (req, res) => {
  con.query('SELECT s.id, s.time, r.email FROM slots s INNER JOIN reservations r ON s.id = r.slotid', function (err, result) {
    if (err) throw err;
    formattedResult = result.map(slot => {
      return {
        id: slot.id,
        date: slot.time.toLocaleDateString(),
        time: slot.time.toLocaleTimeString(),
        email: slot.email
      };
    });
    res.status(201).json(formattedResult);
  });
});

app.post('/api/cancel', (req, res) => {
  const { slots } = req.body;

  // Basic validation to ensure slots is an array
  if (!Array.isArray(slots) || slots.length === 0) {
    return res.status(400).json({ message: 'Invalid input data.' });
  }

  con.query('DELETE FROM reservations WHERE slotid IN (?)', [slots], function (err, result) {
    if (err) {
      console.error('Error canceling reservations:', err);
      return res.status(500).json({ message: 'An error occurred while canceling reservations.' });
    }

    res.status(200).json({ message: 'Reservation canceled!', affectedRows: result.affectedRows });
  });
});

app.post('/api/delete', (req, res) => {
  const slots = req.body.slots;

  // Basic validation to ensure slots is an array
  if (!Array.isArray(slots) || slots.length === 0) {
    return res.status(400).json({ message: 'Invalid input data.' });
  }

  // check if slot is reserved if yes cancel reservation
  con.query('SELECT * FROM reservations WHERE slotid IN (?)', [slots], function (err, result) {
    if (err) {
      console.error('Error deleting timeslots:', err);
      return res.status(500).json({ message: 'An error occurred while deleting timeslots.' });
    }
    if (result.length > 0) {
      con.query('DELETE FROM reservations WHERE slotid IN (?)', [slots], function (err, result) {
        if (err) throw err;
      });
    }
  });

  // delete slot
  con.query('DELETE FROM slots WHERE id IN (?)', [slots], function (err, result) {
    if (err) throw err;
    res.status(201).json({ message: 'Slot deleted!' });
  });
});

app.post('/api/add', (req, res) => {
  const { startTime, endTime, interval } = req.body;

  if (!startTime || !endTime || !interval) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const beginDateTime = new Date(startTime);
  const endDateTime = new Date(endTime);
  const intervalMinutes = parseInt(interval, 10);

  if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
    return res.status(400).json({ message: 'Invalid interval.' });
  }

  const slots = [];
  let date = beginDateTime;
  while (date < endDateTime) {
    slots.push(date);
    date = new Date(date.getTime() + intervalMinutes * 60000);
  }

  // Insert slots into the database
  const values = slots.map(slot => [slot]);

  con.query('INSERT INTO slots (time) VALUES ?', [values], function (err, result) {
    if (err) {
      console.error('Error inserting slots:', err);
      return res.status(500).json({ message: 'An error occurred while adding timeslots.' });
    }

    res.status(201).json({ message: 'Timeslots added successfully!', affectedRows: result.affectedRows });
  });
});

app.post('/api/login', function(request, res) {
	// Capture the input fields
	let username = request.body.username;
	let password = request.body.password;
	// Ensure the input fields exists and are not empty
	if (username && password) {
		// Execute SQL query that'll select the account from the database based on the specified username and password
		con.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			// If there is an issue with the query, output the error
			if (error) throw error;
			// If the account exists
			if (results.length > 0) {
				// Authenticate the user
				request.session.loggedin = true;
				request.session.username = username;
				// Redirect to home page
				res.status(201).json({ message: 'Authenticated' });
			} else {
				res.status(400).json({ message: 'Incorrect Username and/or Password!' });
			}			
		});
	} else {
		res.status(400).json({ message: 'Please enter Username and Password!' });
	}
});

app.post('/api/logout', function(request, res) {
  // Destroy the session
  request.session.destroy(function(error) {
    // Redirect to login page
    res.status(201).json({ message: 'Logged out' });
  });
});

app.post('/api/loggedin', function(request, res) {
  // If the user is loggedin send ok
  if (request.session.loggedin) {
    res.status(200).json({ message: 'Logged in' });
  } else {
    res.status(400).json({ message: 'Not logged in' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Route to serve success.html
app.get('/success', (req, res) => {
 res.sendFile(path.join(__dirname, 'views', 'success.html'));
});

app.get('/login', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/dashboard', function(request, res) {
	// If the user is loggedin
	if (request.session.loggedin) {
		// Output username
		res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
	} else {
		// Not logged in
		// Redirect to login page
    res.redirect('/login');
	}
});

app.get('/dashboard/add', function(request, res) {
  // If the user is loggedin
  if (request.session.loggedin) {
    // Output username
    res.sendFile(path.join(__dirname, 'views', 'dashboard/add.html'));
  } else {
    // Not logged in
    // Redirect to login page
    res.redirect('/login');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function createSlots() {
  // create a array of time (sql object) with 10 minutes interval

  const beginDateTime = new Date('2024-06-19 12:00:00');
  const endDateTime = new Date('2024-06-19 15:00:00');

  const slots = [];
  let date = beginDateTime;
  while (date < endDateTime) {
    slots.push(date);
    date = new Date(date.getTime() + 10 * 60000);
  }

  // insert
  slots.forEach(slot => {
    con.query('INSERT INTO slots (time) VALUES (?)', [slot], function (err, result) {
      if (err) throw err;
      console.log('Inserted ' + slot);
    });
  });
}