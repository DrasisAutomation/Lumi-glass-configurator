const express = require('express');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

const app = express();
const path = require('path');
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  process.exit(1);
}


// CORS middleware with Cross-Origin-Opener-Policy fix
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.use(express.json());

// Temporary storage
const tempStorage = {
  otps: new Map(),
  verifiedUsers: new Map()
};

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'drasisconfigurator@gmail.com',
    pass: 'ijxnpnqvwchzygjr'
  }
});

// Test email connection
transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

const ADMIN_EMAIL = 'drasisconfigurator@gmail.com';

// OTP generator
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP function
function storeOTP(email, otp) {
  tempStorage.otps.set(email, {
    otp: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  });
  console.log(`Stored OTP for ${email}: ${otp}`);
}

// Send email function
async function sendEmail(mailOptions) {
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${mailOptions.to}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
}

// Health check
app.get('/health-check', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    firebase: 'Connected',
    email: 'Configured'
  });
});

// Check if Firebase user exists
app.post('/check-user', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    console.log('🔍 Checking Firebase Auth for:', email);

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      console.log('✅ User found in Firebase:', userRecord.email);
      res.json({ success: true, exists: true, email: userRecord.email });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('❌ User not found in Firebase:', email);
        res.json({ success: true, exists: false, email });
      } else {
        console.error('Firebase Auth error:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error checking user existence:', error);
    res.status(500).json({ success: false, message: 'Failed to check user existence' });
  }
});

// Send OTP for new users
app.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate it's a Gmail
    if (!email.endsWith('@gmail.com')) {
      return res.status(400).json({
        success: false,
        message: 'Only Gmail addresses are allowed'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP
    storeOTP(email, otp);
    
    // Send OTP to ADMIN email
    const mailOptions = {
      from: 'drasisconfigurator@gmail.com',
      to: ADMIN_EMAIL,
      subject: 'Lumi Configurator - OTP Verification Request',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #1e3a5f; text-align: center; margin-bottom: 20px;">Lumi Configurator - OTP Verification</h2>
            
            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1971c2; margin-top: 0;">New User Verification Request</h3>
              <p><strong>User Email:</strong> ${email}</p>
              <p><strong>Request Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="color: #856404; margin-top: 0;">Verification Code</h3>
              <div style="font-size: 32px; font-weight: bold; color: #1971c2; letter-spacing: 5px; margin: 15px 0;">
                ${otp}
              </div>
              <p style="color: #856404; margin: 0;"><strong>This OTP will expire in 10 minutes</strong></p>
            </div>
            
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 14px;">
                Please share this OTP with the user <strong>${email}</strong> to complete their verification process.
              </p>
            </div>
          </div>
        </div>
      `
    };

    await sendEmail(mailOptions);
    
    console.log(`📧 OTP ${otp} sent to admin for user: ${email}`);
    
    res.json({
      success: true,
      message: 'OTP sent to administrator'
    });
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
});

// Verify OTP → create Firebase user if needed
app.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    console.log(`🔐 Verifying OTP for: ${email}, OTP: ${otp}`);

    const otpData = tempStorage.otps.get(email);
    if (!otpData) {
      console.log('❌ OTP not found for:', email);
      return res.status(400).json({ success: false, message: 'OTP not found or expired. Please request a new OTP.' });
    }

    const now = new Date();
    if (now > otpData.expiresAt) {
      tempStorage.otps.delete(email);
      console.log('❌ OTP expired for:', email);
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new OTP.' });
    }

    if (otp !== otpData.otp) {
      console.log('❌ Invalid OTP for:', email);
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    console.log('✅ OTP verified successfully for:', email);

    // OTP valid → create user in Firebase if doesn't exist
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log(`✅ User already exists: ${email}`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        // Create new user in Firebase Auth
        userRecord = await admin.auth().createUser({
          email: email,
          emailVerified: true,
          password: Math.random().toString(36).slice(-8) // Random password
        });
        console.log(`✅ Created new Firebase user: ${email}`);
      } else {
        throw err;
      }
    }

    // Clean up OTP
    tempStorage.otps.delete(email);

    // Generate custom token for client-side authentication
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    res.json({
      success: true,
      message: 'OTP verified successfully',
      customToken: customToken
    });
  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

// Generate custom token for existing users
app.post('/get-token', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const user = await admin.auth().getUserByEmail(email);
    const customToken = await admin.auth().createCustomToken(user.uid);

    res.json({ success: true, customToken });
  } catch (err) {
    console.error('❌ Error generating token:', err);
    res.status(500).json({ success: false, message: 'Failed to create token' });
  }
});

// Check verification status (optional)
app.get('/check-verification/:email', (req, res) => {
  try {
    const { email } = req.params;
    const verifiedData = tempStorage.verifiedUsers.get(email);
    if (verifiedData) {
      const now = new Date();
      if (now < verifiedData.expiresAt)
        return res.json({ success: true, verified: true, email });
      tempStorage.verifiedUsers.delete(email);
    }
    res.json({ success: true, verified: false });
  } catch (error) {
    console.error('❌ Error checking verification:', error);
    res.status(500).json({ success: false, message: 'Failed to check verification status' });
  }
});

// Clean up expired OTPs periodically
setInterval(() => {
  const now = new Date();
  let cleaned = 0;
  for (const [email, otpData] of tempStorage.otps.entries()) {
    if (now > otpData.expiresAt) {
      tempStorage.otps.delete(email);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired OTPs`);
  }
}, 5 * 60 * 1000); // Run every 5 minutes

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 Lumi Configurator Server Started!');
  console.log('══════════════════════════════════════');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`✅ Health Check: http://localhost:${PORT}/health-check`);
  console.log(`📧 OTPs sent to: ${ADMIN_EMAIL}`);
  console.log('⏰ OTP Expiry: 10 minutes');
  console.log('🔐 Authentication: Gmail users only');
  console.log('🔄 OTP Logic: New users require OTP verification');
  console.log('✅ Existing users: Direct login');
  console.log('══════════════════════════════════════\n');
});