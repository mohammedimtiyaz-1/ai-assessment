import pino from "pino";

const getLogLevel = () => {
  if (typeof window !== 'undefined') {
    return 'info';
  }
  // Only import env on server side
  if (typeof process !== 'undefined' && process.env?.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }
  return 'info';
};

export const logger = pino({
  level: getLogLevel(),
});
