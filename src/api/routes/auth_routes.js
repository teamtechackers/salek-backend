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
    const { phoneNumber, phone_number } = req.body;
    const phone = phoneNumber || phone_number;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // If user exists but has been deactivated/deleted, block login
    try {
      const existingUser = await getUserByPhoneNumber(phone, true);
      if (existingUser.success && existingUser.user && existingUser.user.is_active === false) {
        return res.status(403).json({
          success: false,
          message: 'Account is disabled. Please contact support.'
        });
      }
    } catch (lookupError) {
      logger.warn('User lookup failed during send OTP:', lookupError.message);
    }

    const result = await sendOtpWithFallback(phone);

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
    const { sessionId, otpCode, phoneNumber, phone_number } = req.body;
    const phone = phoneNumber || phone_number;

    if (!sessionId || !otpCode || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, OTP code, and phone number are required'
      });
    }

    // Verify OTP with Twilio
    const otpResult = await verifyOtpWithFallback(sessionId, otpCode, phone);

    if (!otpResult.success) {
      return res.status(401).json({
        success: false,
        message: otpResult.error
      });
    }

    // Check if user exists
    let userResult = await getUserByPhoneNumber(phone, true);
    
    if (!userResult.success) {
      // Create new user with phone number
      const createResult = await createUser(phone);
      if (!createResult.success) {
        logger.error('Create user failed:', createResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create user: ' + createResult.error
        });
      }
      userResult = await getUserByPhoneNumber(phone, true);
    }

    const user = userResult.user;

    if (user && user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled. Please contact support.'
      });
    }

    await updateUserLastLogin(user.id);

    const jwtToken = generateToken({ userId: user.id, phoneNumber: phone });

    logger.info(`User logged in successfully: ${phone}`);

    const encryptedUserId = encryptUserId(user.id);

    // Check if profile is already updated
    const alreadyProfileUpdated = user.profile_completed ? 1 : 0;

    // Check notification permissions
    let hasNotificationPermissions = 0;
    try {
      const { hasAnyNotificationPermission } = await import('../../services/notification_permissions_service.js');
      const anyPerm = await hasAnyNotificationPermission(user.id);
      hasNotificationPermissions = anyPerm.success ? (anyPerm.anyEnabled ? 1 : 0) : 0;
    } catch (error) {
      logger.error('Error checking notification permissions:', error);
      hasNotificationPermissions = 0;
    }

    // Check if user has vaccines
    let hasVaccines = 0;
    try {
      const { getUserVaccines } = await import('../../services/user_vaccines_service.js');
      const vaccinesResult = await getUserVaccines(user.id, false);
      hasVaccines = vaccinesResult.success && vaccinesResult.vaccines && vaccinesResult.vaccines.length > 0 ? 1 : 0;
    } catch (error) {
      logger.error('Error checking vaccines:', error);
      hasVaccines = 0;
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        userId: encryptedUserId,
        token: jwtToken,
        phoneNumber: phoneNumber,
        already_profile_updated: alreadyProfileUpdated,
        has_notification_permissions: hasNotificationPermissions,
        has_vaccines: hasVaccines,
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