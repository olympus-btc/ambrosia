const isDebug = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';

module.exports = {
  log: isDebug ? (...args) => console.log(...args) : () => {},
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};
