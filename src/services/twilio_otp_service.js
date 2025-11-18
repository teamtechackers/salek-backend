import twilio from 'twilio';
import crypto from 'crypto';
import logger from '../config/logger.js';
import { query } from '../config/database.js';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

const createOtpSession = async (phoneNumber) => {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await query(
    'CREATE TABLE IF NOT EXISTS otp_sessions (id VARCHAR(36) PRIMARY KEY, phone_number VARCHAR(20), twilio_sid VARCHAR(255), expires_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
    []
  );

  await query(
    'INSERT INTO otp_sessions (id, phone_number, expires_at) VALUES (?, ?, ?)',
    [sessionId, phoneNumber, expiresAt]
  );

  return { sessionId, expiresAt };
};

export const sendOtpTwilio = async (phoneNumber) => {
  try {
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    logger.info(`🚀 Sending OTP to ${phoneNumber} via Twilio...`);
    logger.info(`🔑 Using Verify Service SID: ${verifyServiceSid}`);
    logger.info(`🔑 Account SID: ${accountSid}`);

    // Validate environment variables
    if (!verifyServiceSid || !accountSid || !authToken) {
      throw new Error('Missing Twilio credentials');
    }

    // Send OTP via Twilio Verify
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications
      .create({ to: phoneNumber, channel: 'sms' });

    logger.info(`✅ Twilio OTP Status: ${verification.status}`);

    // Create session
    const session = await createOtpSession(phoneNumber);

    // Update session with Twilio SID
    await query(
      'UPDATE otp_sessions SET twilio_sid = ? WHERE id = ?',
      [verification.sid, session.sessionId]
    );

    return {
      success: true,
      sessionId: session.sessionId,
      message: 'OTP sent successfully via Twilio',
      phoneNumber: phoneNumber,
      twilioStatus: verification.status
    };

  } catch (error) {
    logger.error('Twilio OTP send error:', error);
    
    if (error.code === 20003) {
      return {
        success: false,
        error: 'Authentication Error - Check Twilio credentials'
      };
    } else if (error.code === 21211) {
      return {
        success: false,
        error: 'Invalid phone number'
      };
    } else if (error.code === 21408) {
      return {
        success: false,
        error: 'Permission denied for this phone number'
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to send OTP'
    };
  }
};

export const verifyOtpTwilio = async (sessionId, otpCode, phoneNumber) => {
  try {
    // Get session from database
    const sessionResult = await query(
      'SELECT * FROM otp_sessions WHERE id = ? AND phone_number = ? AND expires_at > NOW()',
      [sessionId, phoneNumber]
    );

    if (sessionResult.length === 0) {
      return {
        success: false,
        error: 'Invalid or expired session'
      };
    }

    logger.info(`🔍 Verifying OTP for ${phoneNumber} via Twilio...`);

    // Verify OTP with Twilio
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks
      .create({ to: phoneNumber, code: otpCode });

    logger.info(`✅ Twilio Verification Status: ${verificationCheck.status}`);

    if (verificationCheck.status === 'approved') {
      // Delete used session
      await query('DELETE FROM otp_sessions WHERE id = ?', [sessionId]);

      return {
        success: true,
        phoneNumber: phoneNumber,
        message: 'OTP verified successfully'
      };
    } else {
      return {
        success: false,
        error: 'Invalid OTP code'
      };
    }

  } catch (error) {
    logger.error('Twilio OTP verify error:', error);

    if (error.code === 20404) {
      return {
        success: false,
        error: 'Verification not found or expired'
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to verify OTP'
    };
  }
};

// Test phone numbers for development
const TEST_PHONE_NUMBERS = {
  '+923078775479': '123456',
  '+923078795665': '654321',
  '+923001234567': '111111',
  '+923057220934': '123456',
  '+923057220935': '123456',
  '+923057220936': '123456',
  '+923057220937': '123456',
  '+923057220938': '123456',
  '+923057220910': '123456',
  '+923001234568': '123456',
  '+923001234569': '123456',
  '+923001234570': '123456',
  '+923001234571': '123456',
  '+923001234572': '123456',
  '+923001234573': '123456',
  '+923001234574': '123456',
  '+923001234575': '123456',
  '+923001234576': '123456',
  '+923001234578': '123456',
  '+923001234591': '123456',
  '+923001234592': '123456',
  '+923001234593': '123456',
  '+923001234594': '123456',
  '+923001234595': '123456',
  '+923001234596': '123456',
  '+923001234597': '123456',
  '+923001234598': '123456',
  '+923001234599': '123456',
  '+923001234190': '123456',
  '+923001234191': '123456',
  '+923001234192': '123456',
  '+923001234193': '123456',
  '+923001234194': '123456',
  '+923001234195': '123456',
  '+923001234196': '123456',
  '+923001234197': '123456',
  '+923001234198': '123456',
  '+923001234199': '123456',
};

export const sendOtpWithFallback = async (phoneNumber) => {
  if (TEST_PHONE_NUMBERS[phoneNumber]) {
    const session = await createOtpSession(phoneNumber);
    
    logger.info(`🧪 Test number detected: ${phoneNumber}, OTP: ${TEST_PHONE_NUMBERS[phoneNumber]}`);

    return {
      success: true,
      sessionId: session.sessionId,
      message: 'Test OTP ready (check console logs)',
      phoneNumber: phoneNumber,
      isTestNumber: true,
      otp: TEST_PHONE_NUMBERS[phoneNumber]
    };
  }

  // For real numbers, use Twilio
  return await sendOtpTwilio(phoneNumber);
};

export const verifyOtpWithFallback = async (sessionId, otpCode, phoneNumber) => {
  // For test numbers, verify against predefined OTP
  if (TEST_PHONE_NUMBERS[phoneNumber] && otpCode === TEST_PHONE_NUMBERS[phoneNumber]) {
    // Verify session exists
    const sessionResult = await query(
      'SELECT * FROM otp_sessions WHERE id = ? AND phone_number = ? AND expires_at > NOW()',
      [sessionId, phoneNumber]
    );

    if (sessionResult.length === 0) {
      return {
        success: false,
        error: 'Invalid or expired session'
      };
    }

    // Delete used session
    await query('DELETE FROM otp_sessions WHERE id = ?', [sessionId]);

    logger.info(`🧪 Test OTP verified for ${phoneNumber}`);

    return {
      success: true,
      phoneNumber: phoneNumber,
      message: 'Test OTP verified successfully'
    };
  }

  // For real numbers, use Twilio verification
  return await verifyOtpTwilio(sessionId, otpCode, phoneNumber);
};
