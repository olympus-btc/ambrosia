import "@testing-library/jest-dom";

const originalConsoleError = console.error.bind(console);
console.error = (...args) => {
  const message = typeof args[0] === "string" ? args[0] : "";
  if (message.includes("not wrapped in act")) return;
  originalConsoleError(...args);
};
