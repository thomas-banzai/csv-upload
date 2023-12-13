const express = require('express');
const multer = require('multer');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Multer setup for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Use body-parser middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Serve the HTML form for file upload
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Handle file upload
app.post('/upload', upload.single('csvFile'), async (req, res) => {
  try {
    // Extract form data including Event ID, API Key, and API Secret
    const eventId = req.body.eventId;
    const demioApiKey = req.body.apiKey;
    const demioApiSecret = req.body.apiSecret;

    console.log('Event ID:', eventId);
    console.log('API Key:', demioApiKey);
    console.log('API Secret:', demioApiSecret);

    // Process the CSV file
    const rows = [];
    req.file.buffer.toString().split('\n').forEach((line) => {
      // Parse each line into an object
      const columns = line.split(',');

      // Check if the row has valid data
      if (columns.length >= 2 && columns[0].trim() !== '' && columns[1].trim() !== '') {
        const row = {
          // Map your CSV columns to corresponding keys
          // For example, assuming your CSV has columns: Name, Email
          name: columns[0],
          email: columns[1].replace(/\r/g, ''), // Remove newline characters
        };
        rows.push(row);
      }
    });

    console.log('Parsed CSV rows:', rows);

    // Use axios to interact with the Demio API
    const demioApiUrl = 'https://my.demio.com/api/v1/event/register'; // Updated API URL

    // Retry settings
    const maxRetries = 3;
    const delayBetweenRetries = 1000; // in milliseconds

    // Make requests to the Demio API for each valid row with retries
    for (const row of rows) {
      let retries = 0;
      let success = false;

      while (retries < maxRetries && !success) {
        try {
          const requestData = {
            id: eventId, // Assuming Demio requires event_id
            name: row.name,
            email: row.email,
            // Add other required fields based on the Demio API documentation
          };

          console.log('Making Demio API Request:', {
            method: 'POST',
            url: demioApiUrl,
            headers: {
              'Content-Type': 'application/json',
              'Api-Key': demioApiKey,
              'Api-Secret': demioApiSecret,
            },
            data: requestData,
          });

          const response = await axios.post(
            demioApiUrl,
            requestData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Api-Key': demioApiKey,
                'Api-Secret': demioApiSecret,
              },
            }
          );

          console.log('Demio API Response:', response.data);
          success = true;
        } catch (apiError) {
          console.error('Error making Demio API request:', apiError.message);
          console.error('API Response:', apiError.response ? apiError.response.data : 'No response data');

          retries++;
          if (retries < maxRetries) {
            console.log(`Retrying in ${delayBetweenRetries / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delayBetweenRetries));
          }
        }
      }
    }

    res.send('File uploaded and Demio API requests completed successfully!');
  } catch (error) {
    console.error('Error processing file and interacting with Demio API:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
