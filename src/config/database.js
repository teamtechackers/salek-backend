import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'mysql-2779d37e-usmaniqbal8625-00b8.d.aivencloud.com',
  port: process.env.DB_PORT || 18718,
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD || 'AVNS_TCux6DEnM6zgNPeDLSJ',
  database: process.env.DB_NAME || 'salek',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
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
    console.error('Database connection error:', error.message);
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
