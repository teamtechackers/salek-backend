import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Accepts either a primitive userId or a full payload object
export const generateToken = (payloadOrUserId) => {
  const payload = (typeof payloadOrUserId === 'object' && payloadOrUserId !== null)
    ? payloadOrUserId
    : { userId: payloadOrUserId };
  return jwt.sign(payload, JWT_SECRET);
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};
