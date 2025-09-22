import express from 'express';
import { sendOtpWithFallback, verifyOtpWithFallback } from '../../services/twilio_otp_service.js';
import { createUser, getUserByPhoneNumber, updateUserLastLogin } from '../../services/user_service.js';
import { generateToken } from '../../services/jwt_service.js';
import { encryptUserId } from '../../services/encryption_service.js';
import { AUTH_MESSAGES } from '../../config/constants.js';
import { logout } from '../controllers/logout_controller.js';
import logger from '../../config/logger.js';

const router = express.Router();

const sendOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const result = await sendOtpWithFallback(phoneNumber);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        sessionId: result.sessionId,
        phoneNumber: result.phoneNumber,
        isTestNumber: result.isTestNumber || false
      }
    });

  } catch (error) {
    logger.error('Send OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const verifyOtpAndLogin = async (req, res) => {
  try {
    const { sessionId, otpCode, phoneNumber } = req.body;

    if (!sessionId || !otpCode || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, OTP code, and phone number are required'
      });
    }

    // Verify OTP with Twilio
    const otpResult = await verifyOtpWithFallback(sessionId, otpCode, phoneNumber);

    if (!otpResult.success) {
      return res.status(401).json({
        success: false,
        message: otpResult.error
      });
    }

    // Check if user exists
    let userResult = await getUserByPhoneNumber(phoneNumber);
    
    if (!userResult.success) {
      // Create new user with phone number
      const createResult = await createUser(phoneNumber);
      if (!createResult.success) {
        logger.error('Create user failed:', createResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create user: ' + createResult.error
        });
      }
      userResult = await getUserByPhoneNumber(phoneNumber);
    }

    const user = userResult.user;
    await updateUserLastLogin(user.id);

    const jwtToken = generateToken({ userId: user.id, phoneNumber: phoneNumber });

    logger.info(`User logged in successfully: ${phoneNumber}`);

    const encryptedUserId = encryptUserId(user.id);

    // Check if profile is already updated
    const alreadyProfileUpdated = !!(user.full_name && user.dob) ? 1 : 0;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        userId: encryptedUserId,
        token: jwtToken,
        phoneNumber: phoneNumber,
        already_profile_updated: alreadyProfileUpdated,
        user: {
          phone_number: user.phone_number,
          full_name: user.full_name,
          is_profile_complete: !!(user.full_name && user.dob)
        }
      }
    });

  } catch (error) {
    logger.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtpAndLogin);
router.post('/logout', logout);

export default router;