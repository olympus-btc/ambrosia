export const useTurn = () => ({
  openTurn: null,
  openShiftData: null,
  loading: false,
  error: null,
  setOpenTurn: jest.fn(),
  updateTurn: jest.fn(),
  refreshTurn: jest.fn(),
  openShift: jest.fn(),
  closeShift: jest.fn(),
});
