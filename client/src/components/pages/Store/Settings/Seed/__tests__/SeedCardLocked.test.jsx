import { render, screen, fireEvent } from "@testing-library/react";

import { SeedCardLocked } from "../SeedCardLocked";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>{children}</button>
  ),
  Card: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  CardFooter: ({ children }) => <div>{children}</div>,
}));

const t = (key) => key;

function renderLocked(props = {}) {
  return render(<SeedCardLocked t={t} onReveal={jest.fn()} {...props} />);
}

describe("SeedCardLocked", () => {
  describe("Rendering", () => {
    it("renders the title", () => {
      renderLocked();
      expect(screen.getByText("cardSeed.title")).toBeInTheDocument();
    });

    it("renders the warning message", () => {
      renderLocked();
      expect(screen.getByText("cardSeed.warning")).toBeInTheDocument();
    });

    it("renders the description", () => {
      renderLocked();
      expect(screen.getByText("cardSeed.description")).toBeInTheDocument();
    });

    it("renders the reveal button", () => {
      renderLocked();
      expect(screen.getByText("cardSeed.revealButton")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("calls onReveal when the reveal button is pressed", () => {
      const onReveal = jest.fn();
      renderLocked({ onReveal });
      fireEvent.click(screen.getByText("cardSeed.revealButton"));
      expect(onReveal).toHaveBeenCalledTimes(1);
    });
  });
});
