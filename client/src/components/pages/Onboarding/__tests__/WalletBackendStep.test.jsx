import { render, screen, fireEvent } from "@testing-library/react";

import { testPhoenixdConnection } from "@/services/initialSetupService";

import { WalletBackendStep } from "../WalletBackendStep";

jest.mock("@/services/initialSetupService");

jest.mock("@heroui/react", () => ({
  Card: ({ children, onPress, ...props }) => (
    <div role="button" onClick={onPress} {...props}>{children}</div>
  ),
  CardBody: ({ children }) => <div>{children}</div>,
  Input: ({ label, value, onValueChange, errorMessage, description }) => (
    <div>
      <label htmlFor={label}>{label}</label>
      <input id={label} value={value} onChange={(event) => onValueChange(event.target.value)} />
      {errorMessage && <span>{errorMessage}</span>}
      {description && <span>{description}</span>}
    </div>
  ),
}));

let mockPhoenixdRemoteFieldsProps = null;

jest.mock("@components/shared/PhoenixdRemoteFields", () => ({
  PhoenixdRemoteFields: (props) => {
    mockPhoenixdRemoteFieldsProps = props;
    const {
      phoenixdRemote,
      phoenixdUrl,
      phoenixdPassword,
      onPhoenixdRemoteChange,
      onPhoenixdUrlChange,
      onPhoenixdPasswordChange,
    } = props;
    return (
      <div data-testid="phoenixd-remote-fields">
        <span data-testid="phoenixd-remote-value">{String(phoenixdRemote)}</span>
        <span data-testid="phoenixd-url-value">{phoenixdUrl}</span>
        <span data-testid="phoenixd-password-value">{phoenixdPassword}</span>
        <button type="button" onClick={() => onPhoenixdRemoteChange(true)}>toggle-remote</button>
        <button type="button" onClick={() => onPhoenixdUrlChange("http://100.1.1.1:9740")}>set-url</button>
        <button type="button" onClick={() => onPhoenixdPasswordChange("remote-password")}>set-password</button>
      </div>
    );
  },
}));

function renderStep(walletBackendData = {}, onChange = jest.fn()) {
  const defaultData = { walletBackend: "phoenixd", nwcUri: "" };
  return { onChange, ...render(<WalletBackendStep walletBackendData={{ ...defaultData, ...walletBackendData }} onChange={onChange} />) };
}

describe("WalletBackendStep", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("phoenixd selected", () => {
    it("renders PhoenixdRemoteFields and not the NWC URI input", () => {
      renderStep({ walletBackend: "phoenixd" });

      expect(screen.getByTestId("phoenixd-remote-fields")).toBeInTheDocument();
      expect(screen.queryByLabelText("stepWallet.uriLabel")).not.toBeInTheDocument();
    });

    it("passes the current phoenixd remote/url/password data through", () => {
      renderStep({
        walletBackend: "phoenixd",
        phoenixdRemote: true,
        phoenixdUrl: "http://100.1.1.1:9740",
        phoenixdPassword: "remote-password",
      });

      expect(screen.getByTestId("phoenixd-remote-value").textContent).toBe("true");
      expect(screen.getByTestId("phoenixd-url-value").textContent).toBe("http://100.1.1.1:9740");
      expect(screen.getByTestId("phoenixd-password-value").textContent).toBe("remote-password");
    });

    it("passes the initialSetupService test-connection function through", () => {
      renderStep({ walletBackend: "phoenixd" });

      expect(mockPhoenixdRemoteFieldsProps.onTestConnection).toBe(testPhoenixdConnection);
    });

    it("forwards onPhoenixdRemoteChange as phoenixdRemote, keeping walletBackend as phoenixd", () => {
      const { onChange } = renderStep({ walletBackend: "phoenixd" });

      fireEvent.click(screen.getByText("toggle-remote"));

      expect(onChange).toHaveBeenCalledWith({ phoenixdRemote: true, walletBackend: "phoenixd" });
    });

    it("forwards onPhoenixdUrlChange as phoenixdUrl, keeping walletBackend as phoenixd", () => {
      const { onChange } = renderStep({ walletBackend: "phoenixd" });

      fireEvent.click(screen.getByText("set-url"));

      expect(onChange).toHaveBeenCalledWith({ phoenixdUrl: "http://100.1.1.1:9740", walletBackend: "phoenixd" });
    });

    it("forwards onPhoenixdPasswordChange as phoenixdPassword, keeping walletBackend as phoenixd", () => {
      const { onChange } = renderStep({ walletBackend: "phoenixd" });

      fireEvent.click(screen.getByText("set-password"));

      expect(onChange).toHaveBeenCalledWith({ phoenixdPassword: "remote-password", walletBackend: "phoenixd" });
    });

    it("selecting nwc clears the phoenixd remote fields", () => {
      const { onChange } = renderStep({
        walletBackend: "phoenixd",
        phoenixdRemote: true,
        phoenixdUrl: "http://100.1.1.1:9740",
        phoenixdPassword: "remote-password",
      });

      fireEvent.click(screen.getByText("stepWallet.nwcName").closest('[role="button"]'));

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          walletBackend: "nwc",
          phoenixdRemote: false,
          phoenixdUrl: "",
          phoenixdPassword: "",
        }),
      );
    });
  });

  describe("nwc selected", () => {
    it("renders the NWC URI input and not PhoenixdRemoteFields", () => {
      renderStep({ walletBackend: "nwc" });

      expect(screen.getByLabelText("stepWallet.uriLabel")).toBeInTheDocument();
      expect(screen.queryByTestId("phoenixd-remote-fields")).not.toBeInTheDocument();
    });
  });
});
