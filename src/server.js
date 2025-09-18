import dotenv from 'dotenv';
import app from './app.js';
import logger from './config/logger.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
