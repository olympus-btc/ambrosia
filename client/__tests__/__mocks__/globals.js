if (typeof global.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("util");
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

if (typeof global.localStorage === "undefined") {
  const store = {};
  global.localStorage = {
    getItem: jest.fn((key) => store[key]),
    setItem: jest.fn((key, value) => { store[key] = String(value); }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  };
}
