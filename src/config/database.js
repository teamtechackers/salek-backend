import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('MySQL connected successfully');
    connection.release();
    return true;
  } catch (error) {
    logger.error('MySQL connection failed:', error);
    return false;
  }
};

export const query = async (sql, params = []) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
};

export default pool;
