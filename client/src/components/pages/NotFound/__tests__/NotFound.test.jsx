import { render, screen, act } from "@testing-library/react";

import { I18nProvider } from "@i18n/I18nProvider";

import { NotFound } from "../NotFound";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("lucide-react", () => ({
  SearchX: () => <div>SearchX Icon</div>,
  Languages: () => <div>Languages Icon</div>,
}));

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(() => Promise.resolve({})),
}));

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const renderNotFound = () => render(
  <I18nProvider>
    <NotFound />
  </I18nProvider>,
);

describe("NotFound", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders the error code", async () => {
      await act(async () => renderNotFound());
      expect(screen.getByText("errorCode")).toBeInTheDocument();
    });

    it("renders the heading", async () => {
      await act(async () => renderNotFound());
      expect(screen.getByText("heading")).toBeInTheDocument();
    });

    it("renders the description", async () => {
      await act(async () => renderNotFound());
      expect(screen.getByText("description")).toBeInTheDocument();
    });

    it("renders the go home button", async () => {
      await act(async () => renderNotFound());
      expect(screen.getByText("goHome")).toBeInTheDocument();
    });

    it("renders the search icon", async () => {
      await act(async () => renderNotFound());
      expect(screen.getByText("SearchX Icon")).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("go home button links to /", async () => {
      await act(async () => renderNotFound());
      const link = screen.getByText("goHome").closest("a");
      expect(link).toHaveAttribute("href", "/");
    });
  });
});
