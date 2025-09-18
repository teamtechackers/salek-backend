/* Simple logger using console (can later be replaced with Winston or pino) */

const logger = {
  info: (message, ...args) => {
    console.log(`ℹ️  ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`⚠️  ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`❌ ${message}`, ...args);
  },
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`🐛 ${message}`, ...args);
    }
  },
};

export default logger;
