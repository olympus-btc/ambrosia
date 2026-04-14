const driver = jest.fn(() => ({
  drive: jest.fn(),
  destroy: jest.fn(),
  refresh: jest.fn(),
  moveNext: jest.fn(),
  movePrevious: jest.fn(),
  hasNextStep: jest.fn(() => false),
  hasPreviousStep: jest.fn(() => false),
  isActive: jest.fn(() => false),
}));

module.exports = { driver };
