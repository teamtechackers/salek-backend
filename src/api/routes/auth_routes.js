import express from 'express';
import { sendOtpBackend, verifyOtpBackend } from '../../services/backend_otp_service.js';
import { createUser, updateUserLastLogin } from '../../services/user_service.js';
import { generateToken } from '../../services/jwt_service.js';
import { encryptUserId } from '../../services/encryption_service.js';
import { AUTH_MESSAGES } from '../../config/constants.js';
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

    const result = await sendOtpBackend(phoneNumber);

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
        otpCode: result.otpCode
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

    const otpResult = await verifyOtpBackend(sessionId, otpCode, phoneNumber);

    if (!otpResult.success) {
      return res.status(401).json({
        success: false,
        message: otpResult.error
      });
    }

    const userResult = await createUser(otpResult.firebaseUid, otpResult.phoneNumber);

    if (!userResult.success) {
      return res.status(500).json({
        success: false,
        message: AUTH_MESSAGES.SERVER_ERROR
      });
    }

    await updateUserLastLogin(userResult.userId || userResult.user.id);

    const jwtToken = generateToken(userResult.userId || userResult.user.id);

    logger.info(`User logged in successfully: ${otpResult.firebaseUid}`);

    const actualUserId = userResult.userId || userResult.user.id;
    const encryptedUserId = encryptUserId(actualUserId);

    return res.status(200).json({
      success: true,
      message: AUTH_MESSAGES.LOGIN_SUCCESS,
      data: {
        userId: encryptedUserId,
        firebaseUid: otpResult.firebaseUid,
        token: jwtToken,
        phoneNumber: otpResult.phoneNumber
      }
    });

  } catch (error) {
    logger.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: AUTH_MESSAGES.SERVER_ERROR
    });
  }
};

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtpAndLogin);

export default router;
