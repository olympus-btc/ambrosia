import { render, screen, fireEvent, act } from "@testing-library/react";

import { PhoenixdRemoteFields } from "../PhoenixdRemoteFields";

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ onPress, children, isDisabled, ...props }) => (
    <button type="button" disabled={isDisabled} onClick={onPress} {...props}>{children}</button>
  ),
  Input: ({ label, value, onValueChange, placeholder, type }) => (
    <label>
      {label}
      <input placeholder={placeholder} type={type} value={value} onChange={(event) => onValueChange(event.target.value)} />
    </label>
  ),
  Switch: ({ isSelected, onValueChange, ...props }) => (
    <input type="checkbox" checked={isSelected} onChange={(event) => onValueChange(event.target.checked)} {...props} />
  ),
}));

function renderFields(props = {}) {
  return render(
    <PhoenixdRemoteFields
      phoenixdRemote={false}
      phoenixdUrl=""
      phoenixdPassword=""
      onPhoenixdRemoteChange={jest.fn()}
      onPhoenixdUrlChange={jest.fn()}
      onPhoenixdPasswordChange={jest.fn()}
      onTestConnection={jest.fn()}
      {...props}
    />,
  );
}

describe("PhoenixdRemoteFields", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("always renders the remote toggle", () => {
      renderFields();
      expect(screen.getByText("remoteToggleLabel")).toBeInTheDocument();
    });

    it("hides the url/password fields when remote is off", () => {
      renderFields({ phoenixdRemote: false });
      expect(screen.queryByText("urlLabel")).not.toBeInTheDocument();
      expect(screen.queryByText("passwordLabel")).not.toBeInTheDocument();
    });

    it("shows the url/password fields when remote is on", () => {
      renderFields({ phoenixdRemote: true });
      expect(screen.getByText("urlLabel")).toBeInTheDocument();
      expect(screen.getByText("passwordLabel")).toBeInTheDocument();
    });
  });

  describe("Toggle interaction", () => {
    it("calls onPhoenixdRemoteChange with the new value", () => {
      const onPhoenixdRemoteChange = jest.fn();
      renderFields({ onPhoenixdRemoteChange });
      fireEvent.click(screen.getByRole("checkbox"));
      expect(onPhoenixdRemoteChange).toHaveBeenCalledWith(true);
    });
  });

  describe("Url/password inputs", () => {
    it("calls onPhoenixdUrlChange with the entered value", () => {
      const onPhoenixdUrlChange = jest.fn();
      renderFields({ phoenixdRemote: true, onPhoenixdUrlChange });
      fireEvent.change(screen.getByPlaceholderText("http://100.x.x.x:9740"), { target: { value: "http://100.1.1.1:9740" } });
      expect(onPhoenixdUrlChange).toHaveBeenCalledWith("http://100.1.1.1:9740");
    });

    it("calls onPhoenixdPasswordChange with the entered value", () => {
      const onPhoenixdPasswordChange = jest.fn();
      renderFields({ phoenixdRemote: true, onPhoenixdPasswordChange });
      const passwordInput = screen.getByText("passwordLabel").querySelector("input");
      fireEvent.change(passwordInput, { target: { value: "remote-password" } });
      expect(onPhoenixdPasswordChange).toHaveBeenCalledWith("remote-password");
    });
  });

  describe("Test connection", () => {
    it("disables the test button when url or password is missing", () => {
      renderFields({ phoenixdRemote: true, phoenixdUrl: "", phoenixdPassword: "" });
      expect(screen.getByText("testButton")).toBeDisabled();
    });

    it("enables the test button when both url and password are present", () => {
      renderFields({ phoenixdRemote: true, phoenixdUrl: "http://100.1.1.1:9740", phoenixdPassword: "remote-password" });
      expect(screen.getByText("testButton")).not.toBeDisabled();
    });

    it("calls onTestConnection with the current url and password", async () => {
      const onTestConnection = jest.fn().mockResolvedValue({ nodeId: "node-1" });
      renderFields({
        phoenixdRemote: true,
        phoenixdUrl: "http://100.1.1.1:9740",
        phoenixdPassword: "remote-password",
        onTestConnection,
      });

      await act(async () => {
        fireEvent.click(screen.getByText("testButton"));
      });

      expect(onTestConnection).toHaveBeenCalledWith("http://100.1.1.1:9740", "remote-password");
    });

    it("shows a success toast when the connection test succeeds", async () => {
      const onTestConnection = jest.fn().mockResolvedValue({ nodeId: "node-1" });
      const { addToast } = require("@heroui/react");
      renderFields({
        phoenixdRemote: true,
        phoenixdUrl: "http://100.1.1.1:9740",
        phoenixdPassword: "remote-password",
        onTestConnection,
      });

      await act(async () => {
        fireEvent.click(screen.getByText("testButton"));
      });

      expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ color: "success", description: "testSuccess" }));
    });

    it("shows the error message when the connection test fails", async () => {
      const onTestConnection = jest.fn().mockRejectedValue(new Error("Lightning node is unavailable"));
      const { addToast } = require("@heroui/react");
      renderFields({
        phoenixdRemote: true,
        phoenixdUrl: "http://100.1.1.1:9740",
        phoenixdPassword: "wrong-password",
        onTestConnection,
      });

      await act(async () => {
        fireEvent.click(screen.getByText("testButton"));
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "Lightning node is unavailable" }),
      );
    });

    it("falls back to the generic error message when the failure has no message", async () => {
      const onTestConnection = jest.fn().mockRejectedValue(new Error());
      const { addToast } = require("@heroui/react");
      renderFields({
        phoenixdRemote: true,
        phoenixdUrl: "http://100.1.1.1:9740",
        phoenixdPassword: "wrong-password",
        onTestConnection,
      });

      await act(async () => {
        fireEvent.click(screen.getByText("testButton"));
      });

      expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ color: "danger", description: "testError" }));
    });
  });
});
