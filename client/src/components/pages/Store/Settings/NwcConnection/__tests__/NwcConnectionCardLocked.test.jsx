import { render, screen, fireEvent } from "@testing-library/react";

import { NwcConnectionCardLocked } from "../NwcConnectionCardLocked";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  CardFooter: ({ children }) => <div>{children}</div>,
}));

const translate = (key) => key;

function renderLocked(props = {}) {
  return render(<NwcConnectionCardLocked nwcConnectionTranslations={translate} onReveal={jest.fn()} {...props} />);
}

describe("NwcConnectionCardLocked", () => {
  describe("Rendering", () => {
    it("renders the title", () => {
      renderLocked();
      expect(screen.getByText("nwcConnection.title")).toBeInTheDocument();
    });

    it("renders the description", () => {
      renderLocked();
      expect(screen.getByText("nwcConnection.description")).toBeInTheDocument();
    });

    it("renders the manage button", () => {
      renderLocked();
      expect(screen.getByText("nwcConnection.manageButton")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("calls onReveal when the manage button is pressed", () => {
      const onReveal = jest.fn();
      renderLocked({ onReveal });
      fireEvent.click(screen.getByText("nwcConnection.manageButton"));
      expect(onReveal).toHaveBeenCalledTimes(1);
    });
  });
});
