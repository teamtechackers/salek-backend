import dotenv from 'dotenv';
import app from './src/app.js';
import logger from './src/config/logger.js';
import { initializeDatabase } from './src/database/init.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Initialize database
    const dbInitResult = await initializeDatabase();
    if (!dbInitResult.success) {
      logger.error('Database initialization failed:', dbInitResult.error);
      console.error('Database initialization failed:', dbInitResult.error);
      process.exit(1);
    }
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
