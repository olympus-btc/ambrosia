import { render, screen } from "@testing-library/react";

import { WalletPasswordEncryptionWarning } from "../WalletPasswordEncryptionWarning";

describe("WalletPasswordEncryptionWarning", () => {
  it("renders the message", () => {
    render(<WalletPasswordEncryptionWarning message="Losing this password means losing your secrets" />);

    expect(screen.getByText("Losing this password means losing your secrets")).toBeInTheDocument();
  });

  it("renders the warning icon", () => {
    const { container } = render(<WalletPasswordEncryptionWarning message="Warning" />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
