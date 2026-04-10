import { render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { DeleteUsersModal } from "../DeleteUsersModal";

jest.mock("framer-motion", () => {
  const React = require("react");
  const Mock = React.forwardRef(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>{children}</div>
  ));

  Mock.displayName = "MotionDiv";

  return {
    __esModule: true,
    AnimatePresence: ({ children }) => children,
    LazyMotion: ({ children }) => children,
    domAnimation: {},
    motion: new Proxy({}, { get: () => Mock }),
    m: new Proxy({}, { get: () => Mock }),
  };
});

const user = {
  id: 3,
  name: "Test User",
};

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const renderModal = (props = {}) => render(
  <I18nProvider>
    <DeleteUsersModal
      user={user}
      deleteUsersShowModal
      setDeleteUsersShowModal={jest.fn()}
      onConfirm={jest.fn()}
      {...props}
    />
  </I18nProvider>,
);

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("DeleteUsersModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows warning with user name", () => {
    renderModal();

    expect(screen.getByText("modal.titleDelete")).toBeInTheDocument();
    expect(screen.getByText(/Test User/)).toBeInTheDocument();
    expect(screen.getByText("modal.warningDelete")).toBeInTheDocument();
  });

  it("confirms and closes modal", () => {
    const onConfirm = jest.fn();
    const setDeleteUsersShowModal = jest.fn();

    renderModal({ onConfirm, setDeleteUsersShowModal });

    fireEvent.click(screen.getByText("modal.deleteButton"));
    expect(onConfirm).toHaveBeenCalled();

    fireEvent.click(screen.getByText("modal.cancelButton"));
    expect(setDeleteUsersShowModal).toHaveBeenCalledWith(false);
  });
});
