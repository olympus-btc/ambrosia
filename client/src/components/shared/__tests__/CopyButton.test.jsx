import { render, screen, fireEvent } from "@testing-library/react";

import * as formatters from "@/components/pages/Store/Wallet/utils/formatters";
import { I18nProvider } from "@i18n/I18nProvider";

import { CopyButton } from "../CopyButton";

jest.mock("@/components/pages/Store/Wallet/utils/formatters", () => ({
  copyToClipboard: jest.fn(),
}));

function renderCopyButton(props = {}) {
  return render(
    <I18nProvider>
      <CopyButton value="test-value" label="Copy" {...props} />
    </I18nProvider>,
  );
}

describe("CopyButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the label", () => {
    renderCopyButton({ label: "Copy Invoice" });
    expect(screen.getByText("Copy Invoice")).toBeInTheDocument();
  });

  it("renders the Copy icon", () => {
    const { container } = renderCopyButton();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("calls copyToClipboard with the value on press", () => {
    renderCopyButton({ value: "lnbc123abc", label: "Copy" });
    fireEvent.click(screen.getByRole("button"));
    expect(formatters.copyToClipboard).toHaveBeenCalledWith("lnbc123abc", expect.any(Function));
  });

  it("applies bordered variant by default", () => {
    const { container } = renderCopyButton();
    const button = container.querySelector("button");
    expect(button).toBeInTheDocument();
  });

  it("forwards extra props to the button", () => {
    renderCopyButton({ size: "sm" });
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders with different labels", () => {
    const { rerender } = renderCopyButton({ label: "Copy Hash" });
    expect(screen.getByText("Copy Hash")).toBeInTheDocument();

    rerender(
      <I18nProvider>
        <CopyButton value="x" label="Copy TX ID" />
      </I18nProvider>,
    );
    expect(screen.getByText("Copy TX ID")).toBeInTheDocument();
  });
});
