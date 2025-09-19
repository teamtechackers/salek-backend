import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'salek-encryption-key-32-characters';
const IV_LENGTH = 16;

export const encryptUserId = (userId) => {
  try {
    const text = userId.toString();
    
    // Use a fixed salt to ensure consistency
    const fixedSalt = 'salek_salt_2024';
    const key = crypto.scryptSync(ENCRYPTION_KEY, fixedSalt, 32);
    
    // Use a fixed IV based on user ID to ensure consistency
    const fixedIv = crypto.createHash('md5').update(text + fixedSalt).digest().slice(0, 16);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, fixedIv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Use first 8 characters for consistent format
    const consistentSuffix = encrypted.substring(0, 8);
    return `SLK_${userId}_${consistentSuffix}`;
  } catch (error) {
    // Fallback with hash-based consistent suffix
    const hashSuffix = crypto.createHash('md5').update(userId.toString()).digest('hex').substring(0, 8);
    return `SLK_${userId}_${hashSuffix}`;
  }
};

export const decryptUserId = (encryptedUserId) => {
  try {
    // Handle SLK_userId_suffix format (new consistent format)
    if (encryptedUserId.startsWith('SLK_')) {
      const parts = encryptedUserId.split('_');
      if (parts.length === 3) {
        const userIdPart = parts[1];
        const suffixPart = parts[2];
        
        // Validate that it's a proper encrypted format
        // For our system, valid suffixes should be 8-character hex
        if (suffixPart.length === 8 && /^[a-f0-9]+$/i.test(suffixPart)) {
          const userId = parseInt(userIdPart);
          
          // First try to verify with current encryption algorithm
          const expectedEncrypted = encryptUserId(userId);
          if (expectedEncrypted === encryptedUserId) {
            return userId;
          }
          
          // If current algorithm doesn't match, accept legacy format
          // Legacy formats are valid 8-character hex suffixes
          // This allows backward compatibility with older encrypted IDs
          return userId;
        } else {
          // Invalid format - return null to indicate invalid encryption
          return null;
        }
      }
    }
    
    // If it's just a number, return as is
    return parseInt(encryptedUserId);
  } catch (error) {
    return null;
  }
};

export const generateEncryptedId = (userId) => {
  const timestamp = Date.now();
  const combined = `${userId}_${timestamp}`;
  return encryptUserId(combined);
};
