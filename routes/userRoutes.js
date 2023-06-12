import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Userdb from '../mongodb/models/userdb.js';
import { secretKey } from '../config.js';
import nodemailer from 'nodemailer';
import OTPModel from '../mongodb/models/otpdb.js';
import * as dotenv from 'dotenv';

dotenv.config();


const router = express.Router();

function generateOTP() {
  console.log('OTP generation started')

  const length = 6; // Length of the OTP code
  const characters = '0123456789'; // Possible characters for the OTP code

  let otp = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    otp += characters[randomIndex];
  }
  console.log('Otp is generated:', otp)
  return otp;

}

async function storeOTP(email, otp) {
  try {
    const otpDocument = new OTPModel({
      email,
      otp
    });

    await otpDocument.save();
    console.log('OTP stored successfully');
  } catch (error) {
    console.error('Failed to store OTP:', error);
  }
}


function sendOTPEmail(email, otp) {
  console.log('sending email request recieved')
  const transporter = nodemailer.createTransport({
    // Configure the transport for your email service provider
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: 'OTP Verification for Frost Trek Registration',
    text: `Your OTP is: ${otp}`
  };


  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Failed to send OTP email:', error);
    } else {
      console.log('OTP email sent:', info.response);
      // Handle successful email sending
    }
  });

}

const retrieveOTP = async (email) => {
  try {
    const otpDoc = await OTPModel.findOne({ email });

    if (otpDoc) {
      return otpDoc.otp;
    } else {
      return null; // OTP not found for the email
    }
  } catch (error) {
    console.error('Failed to retrieve OTP:', error);
    throw error;
  }
};


// User Registration
router.post('/register', async (req, res) => {
  console.log('Registration request received');
  try {
    const { username, password, email } = req.body;
    console.log('Username:', username);
    console.log('Email:', email);

    // Check if username already exists
    const existingUsername = await Userdb.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    // Check if email already exists
    const existingEmail = await Userdb.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new Userdb({
      username,
      password: hashedPassword,
      email,
    });

    // Save the user to the database
    await newUser.save();

    res.status(200).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/Register-name-match', async (req, res) => {
  console.log('Username check request is made')
  const { username } = req.query;
  try {
    // Use Mongoose to find a user with the given username
    const existingUsername = await Userdb.findOne({ username });
    if (existingUsername) {
      res.status(200).json({ exists: true });
    }
    console.log('username checked')
  } catch (error) {
    // Handle any errors that occur during the database query
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/Register-email-match', async (req, res) => {
  console.log('Email check request is made')

  try {
    const { email } = req.query;
    console.log('email is :', email)
    // Use Mongoose to find a user with the given username
    const existingEmail = await Userdb.findOne({ email });
    if (existingEmail) {
      res.status(200).json({ exists: true });
      console.log('Email exist')
    }
  } catch (error) {
    // Handle any errors that occur during the database query
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});



// Generate and store OTP for a specific user
router.post('/sendOTP', (req, res) => {
  console.log('OTP Request is recieved')

  try {
    const { email } = req.body;

    // Generate OTP
    const otp = generateOTP(); // Implement your OTP generation logic here
    console.log('Generated OTP is taken:', otp)

    // Store OTP for the user (in database or cache)
    storeOTP(email, otp); // Implement your storage logic here
    console.log('Generated OTP is Stored')

    // Send OTP email
    sendOTPEmail(email, otp) // Implement your email sending logic here
    console.log('Generated OTP is sent')

    // Send response with the OTP value
    res.status(200).json({ otp });

  } catch (error) {
    res.status(401).json({});
  }

});

// Verify OTP entered by the user
router.post('/verifyOTP', async(req, res) => {

  console.log('Token Verification req recieved.')
  try {
    
    const { email, otp } = req.body;

  // Retrieve the stored OTP for the user
  const storedOTP = await retrieveOTP(email) // Implement your retrieval logic here
  console.log('Stored otp is taken:',storedOTP)

  // Compare the entered OTP with the stored OTP
  if (otp === storedOTP) {
    // OTP verification successful
    console.log('USer OTP is matched')
    res.status(200).json({});
  } else {
    // OTP verification failed
    console.log('USer OTP is NOT matched')
    res.status(401).json({});
  }
  } catch (error) {
    res.status(401).json({});
  } 
});

// Helper function to send OTP email





// User Login
router.post('/login', async (req, res) => {
  console.log('Login request received');
  try {
    const { username, password } = req.body;

    // Find user by username in the database
    const user = await Userdb.findOne({ username });
    console.log('USername is taken');

    if (!user) {
      console.log('USername is not exist');
      return res.status(401).json({ message: 'Invalid username or password' });
      

    }

    // Compare the provided password with the hashed password stored in the database
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    console.log('Password is ok');


    // Generate JWT
    const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });
    // const stored = localStorage.setItem('token',token)

    console.log('Token is :',token);


    console.log('JWT token given to user:', token);

    // Return the JWT as a response
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/name-match', async (req, res) => {
  console.log('Username check request is made')
  const { username } = req.query;

  try {
    // Use Mongoose to find a user with the given username
    const user = await Userdb.findOne({ username });

    if (user) {
      // User exists
      res.status(200).json({ exists: true });
      console.log('user exist confirmed')
    } else {
      // User does not exist
      console.log('user does not exist confirmed')

    }
  } catch (error) {
    // Handle any errors that occur during the database query
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Assuming you have set up your Express server and connected to MongoDB

// Define the route handler for checking if the password matches
router.get('/password-match', async (req, res) => {
  console.log('password match request is made');
  try {
    const { username, password } = req.query;
    console.log('username and password requested in query');

    // Find user by username in the database
    const user = await Userdb.findOne({ username });
    console.log('username is being searched');

    if (!user) {
      console.log('username does not exist');
      return res.status(200).json({ exists: false });
    }

    // Compare the provided password with the hashed password stored in the database
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('Password is being compared');

    if (passwordMatch) {
      console.log('Password matches');
      return res.status(200).json({ passwordMatch: true });
    } else {
      console.log('Password does not match');
      return res.status(200).json({ passwordMatch: false });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/username', (req, res) => {
  try {
    // Verify and decode the token
    const decodedToken = jwt.verify(token, { secretKey });

    // Extract the username from the decoded token
    const username = decodedToken.username;

    res.status(200).json({ data: username });
  } catch (error) {
    // Handle token verification errors
    console.error('Error decoding token:', error);
    return null;
  }
})




// Logout
router.get('/logout', (req, res) => {
  // Clear the token from the client-side
  // Assuming you have stored the token in the 'token' key in local storage
  localStorage.removeItem('token');

  res.status(200).json({ message: 'User logged out successfully' });
});

// Endpoint for token verification
// Verify Token





export default router;
