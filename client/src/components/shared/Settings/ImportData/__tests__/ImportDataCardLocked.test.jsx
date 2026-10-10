import { render, screen, fireEvent } from "@testing-library/react";

import { ImportDataCardLocked } from "../ImportDataCardLocked";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  CardFooter: ({ children }) => <div>{children}</div>,
}));

const importDataTranslations = (key) => key;

function renderLocked(props = {}) {
  return render(<ImportDataCardLocked importDataTranslations={importDataTranslations} onReveal={jest.fn()} {...props} />);
}

describe("ImportDataCardLocked", () => {
  describe("Rendering", () => {
    it("renders the title", () => {
      renderLocked();
      expect(screen.getByText("cardImportData.title")).toBeInTheDocument();
    });

    it("renders the description", () => {
      renderLocked();
      expect(screen.getByText("cardImportData.description")).toBeInTheDocument();
    });

    it("renders the import button", () => {
      renderLocked();
      expect(screen.getByText("cardImportData.importButton")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("calls onReveal when the import button is pressed", () => {
      const onReveal = jest.fn();
      renderLocked({ onReveal });
      fireEvent.click(screen.getByText("cardImportData.importButton"));
      expect(onReveal).toHaveBeenCalledTimes(1);
    });
  });
});
