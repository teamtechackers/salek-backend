import dotenv from 'dotenv';
import app from './app.js';
import logger from './config/logger.js';
import { initializeDatabase } from './database/init.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
