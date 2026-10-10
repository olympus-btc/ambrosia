import { render, screen, fireEvent } from "@testing-library/react";

import { ExportDataCardLocked } from "../ExportDataCardLocked";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  CardFooter: ({ children }) => <div>{children}</div>,
}));

const exportDataTranslations = (key) => key;

function renderLocked(props = {}) {
  return render(<ExportDataCardLocked exportDataTranslations={exportDataTranslations} onReveal={jest.fn()} {...props} />);
}

describe("ExportDataCardLocked", () => {
  describe("Rendering", () => {
    it("renders the title", () => {
      renderLocked();
      expect(screen.getByText("cardExportData.title")).toBeInTheDocument();
    });

    it("renders the description", () => {
      renderLocked();
      expect(screen.getByText("cardExportData.description")).toBeInTheDocument();
    });

    it("renders the password notice", () => {
      renderLocked();
      expect(screen.getByText("cardExportData.passwordNotice")).toBeInTheDocument();
    });

    it("renders the export button", () => {
      renderLocked();
      expect(screen.getByText("cardExportData.exportButton")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("calls onReveal when the export button is pressed", () => {
      const onReveal = jest.fn();
      renderLocked({ onReveal });
      fireEvent.click(screen.getByText("cardExportData.exportButton"));
      expect(onReveal).toHaveBeenCalledTimes(1);
    });
  });
});
