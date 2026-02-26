let logger = null;

export const setLogger = (fn) => {
  logger = fn;
};

export const getLogger = () => logger;
