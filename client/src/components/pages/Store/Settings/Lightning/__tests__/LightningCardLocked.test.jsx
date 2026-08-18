import { render, screen, fireEvent } from "@testing-library/react";

import { LightningCardLocked } from "../LightningCardLocked";

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
  return render(
    <LightningCardLocked lightningCardTranslations={translate} onReveal={jest.fn()} {...props} />,
  );
}

describe("LightningCardLocked", () => {
  describe("Rendering", () => {
    it("renders the title", () => {
      renderLocked();
      expect(screen.getByText("title")).toBeInTheDocument();
    });

    it("renders the description", () => {
      renderLocked();
      expect(screen.getByText("description")).toBeInTheDocument();
    });

    it("renders the manage button", () => {
      renderLocked();
      expect(screen.getByText("manageButton")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("calls onReveal when the manage button is pressed", () => {
      const onReveal = jest.fn();
      renderLocked({ onReveal });
      fireEvent.click(screen.getByText("manageButton"));
      expect(onReveal).toHaveBeenCalledTimes(1);
    });
  });
});
