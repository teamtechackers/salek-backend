import admin from '../config/firebase.js';
import axios from 'axios';
import crypto from 'crypto';
import logger from '../config/logger.js';
import { query } from '../config/database.js';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

const createOtpSession = async (phoneNumber) => {
  const sessionId = crypto.randomUUID();
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await query(
    'CREATE TABLE IF NOT EXISTS otp_sessions (id VARCHAR(36) PRIMARY KEY, phone_number VARCHAR(20), otp_code VARCHAR(6), expires_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
    []
  );

  await query(
    'INSERT INTO otp_sessions (id, phone_number, otp_code, expires_at) VALUES (?, ?, ?, ?)',
    [sessionId, phoneNumber, otpCode, expiresAt]
  );

  return { sessionId, otpCode, expiresAt };
};

const verifyOtpSession = async (sessionId, otpCode) => {
  const result = await query(
    'SELECT * FROM otp_sessions WHERE id = ? AND otp_code = ? AND expires_at > NOW()',
    [sessionId, otpCode]
  );

  if (result.length === 0) {
    return null;
  }

  await query('DELETE FROM otp_sessions WHERE id = ?', [sessionId]);
  return result[0];
};

const TEST_PHONE_NUMBERS = {
  '+923078775479': '123456',
  '+923078795665': '654321',
  '+923001234567': '111111'
};

export const sendOtpBackend = async (phoneNumber) => {
  try {
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    const session = await createOtpSession(phoneNumber);

    if (TEST_PHONE_NUMBERS[phoneNumber]) {
      logger.info(`Test number detected: ${phoneNumber}, using predefined OTP`);
      
      const testOtp = TEST_PHONE_NUMBERS[phoneNumber];
      
      await query(
        'UPDATE otp_sessions SET otp_code = ? WHERE id = ?',
        [testOtp, session.sessionId]
      );

      logger.info(`Test OTP for ${phoneNumber}: ${testOtp}`);

      return {
        success: true,
        sessionId: session.sessionId,
        otpCode: testOtp,
        message: 'Test OTP sent (predefined for testing)',
        phoneNumber: phoneNumber
      };
    }

    try {
      logger.info(`Attempting real SMS to ${phoneNumber} via Firebase...`);
      
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`,
        {
          phoneNumber: phoneNumber
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`✅ REAL SMS SENT to ${phoneNumber} via Firebase!`);
      logger.info(`Session Info: ${response.data.sessionInfo}`);

      return {
        success: true,
        sessionId: session.sessionId,
        sessionInfo: response.data.sessionInfo,
        message: '✅ Real OTP SMS sent successfully via Firebase',
        phoneNumber: phoneNumber,
        note: 'Check your phone for SMS'
      };

    } catch (firebaseError) {
      const errorMsg = firebaseError.response?.data?.error?.message || firebaseError.message;
      const errorCode = firebaseError.response?.data?.error?.code || firebaseError.code;
      
      logger.error(`❌ Firebase SMS FAILED: ${errorCode} - ${errorMsg}`);
      
      if (errorCode === 400 && errorMsg.includes('BILLING_NOT_ENABLED')) {
        logger.error('🔥 SOLUTION: Firebase Console → Billing → Upgrade to Blaze Plan (Free tier available)');
      }
      
      logger.info(`Fallback OTP for ${phoneNumber}: ${session.otpCode}`);

      return {
        success: true,
        sessionId: session.sessionId,
        otpCode: session.otpCode,
        message: `❌ Firebase SMS failed: ${errorMsg}. Using fallback OTP.`,
        phoneNumber: phoneNumber,
        firebaseError: errorMsg
      };
    }

  } catch (error) {
    logger.error('Backend OTP send error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const verifyOtpBackend = async (sessionId, otpCode, phoneNumber) => {
  try {
    // Check if it's a test number with predefined OTP
    if (TEST_PHONE_NUMBERS[phoneNumber] && otpCode === TEST_PHONE_NUMBERS[phoneNumber]) {
      logger.info(`Test number OTP verified: ${phoneNumber}`);
    } else {
      // For real Firebase SMS, verify with session
      const session = await verifyOtpSession(sessionId, otpCode);
      if (!session) {
        return {
          success: false,
          error: 'Invalid or expired OTP'
        };
      }
    }

    try {
      const userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
      
      return {
        success: true,
        firebaseUid: userRecord.uid,
        phoneNumber: phoneNumber
      };

    } catch (error) {
      const userRecord = await admin.auth().createUser({
        phoneNumber: phoneNumber
      });

      return {
        success: true,
        firebaseUid: userRecord.uid,
        phoneNumber: phoneNumber
      };
    }

  } catch (error) {
    logger.error('Backend OTP verify error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
