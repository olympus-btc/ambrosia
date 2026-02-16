/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  moduleFileExtensions: ["js", "jsx", "ts", "tsx"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "__tests__/__mocks__/", "/e2e/"],
  setupFiles: [
    "<rootDir>/__tests__/__mocks__/next/fetch.js",
    "<rootDir>/__tests__/__mocks__/globals.js",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@hooks/(.*)$": "<rootDir>/src/hooks/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@lib/(.*)$": "<rootDir>/src/lib/$1",
    "^@providers/(.*)$": "<rootDir>/src/providers/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
    "^@i18n/(.*)$": "<rootDir>/src/i18n/$1",
    "^@app/(.*)$": "<rootDir>/src/app/$1",
    "^next-intl$": "<rootDir>/__tests__/__mocks__/next/next-intl.js",
    "^next/image$": "<rootDir>/__tests__/__mocks__/next/image.js",
    "^framer-motion$": "<rootDir>/__tests__/__mocks__/framer-motion.js",
    "\\.(svg)$": "<rootDir>/__tests__/__mocks__/svgMock.js",
  },
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": [
      "babel-jest",
      { configFile: "./.babel-jest.config.js" },
    ],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!next-intl|@formatjs|react-intl|intl-messageformat)/",
  ],
};

export default config;
