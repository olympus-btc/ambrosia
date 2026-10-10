import { render, screen, fireEvent } from "@testing-library/react";

import { SecretsEncryptionCardSummary } from "../SecretsEncryptionCardSummary";

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

function renderSummary(props = {}) {
  return render(
    <SecretsEncryptionCardSummary secretsEncryptionCardTranslations={translate} onReveal={jest.fn()} {...props} />,
  );
}

describe("SecretsEncryptionCardSummary", () => {
  describe("Rendering", () => {
    it("renders the title", () => {
      renderSummary();
      expect(screen.getByText("secretsEncryptionCard.title")).toBeInTheDocument();
    });

    it("renders the description", () => {
      renderSummary();
      expect(screen.getByText("secretsEncryptionCard.description")).toBeInTheDocument();
    });

    it("renders the manage button", () => {
      renderSummary();
      expect(screen.getByText("secretsEncryptionCard.manageButton")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("calls onReveal when the manage button is pressed", () => {
      const onReveal = jest.fn();
      renderSummary({ onReveal });
      fireEvent.click(screen.getByText("secretsEncryptionCard.manageButton"));
      expect(onReveal).toHaveBeenCalledTimes(1);
    });
  });
});
