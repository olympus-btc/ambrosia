import { render, screen, fireEvent } from "@testing-library/react";

import { selectBackupFile } from "@test-utils/selectBackupFile";

import { BackupPasswordAndFileFields } from "../BackupPasswordAndFileFields";

jest.mock("@heroui/react", () => ({
  Input: ({ label, type, placeholder, value, onChange, endContent }) => (
    <label>
      {label}
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} />
      {endContent}
    </label>
  ),
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>{children}</button>
  ),
}));

jest.mock("lucide-react", () => ({
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eye-off-icon" />,
}));

function renderFields(props = {}) {
  return render(
    <BackupPasswordAndFileFields
      backupPassword=""
      onBackupPasswordChange={jest.fn()}
      onFileChange={jest.fn()}
      {...props}
    />,
  );
}

describe("BackupPasswordAndFileFields", () => {
  describe("Rendering", () => {
    it("renders the password label", () => {
      renderFields();
      expect(screen.getByText("passwordLabel")).toBeInTheDocument();
    });

    it("renders the file label and hint", () => {
      renderFields();
      expect(screen.getByText("fileLabel")).toBeInTheDocument();
      expect(screen.getByText("fileHint")).toBeInTheDocument();
    });
  });

  describe("Password input", () => {
    it("starts masked as a password field", () => {
      renderFields();
      expect(screen.getByPlaceholderText("passwordPlaceholder")).toHaveAttribute("type", "password");
    });

    it("reveals the password as plain text when the toggle is pressed", () => {
      renderFields();
      fireEvent.click(screen.getByTestId("eye-icon"));
      expect(screen.getByPlaceholderText("passwordPlaceholder")).toHaveAttribute("type", "text");
    });

    it("masks the password again when the toggle is pressed a second time", () => {
      renderFields();
      fireEvent.click(screen.getByTestId("eye-icon"));
      fireEvent.click(screen.getByTestId("eye-off-icon"));
      expect(screen.getByPlaceholderText("passwordPlaceholder")).toHaveAttribute("type", "password");
    });

    it("calls onBackupPasswordChange with the entered value", () => {
      const onBackupPasswordChange = jest.fn();
      renderFields({ onBackupPasswordChange });
      fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "s3cret" } });
      expect(onBackupPasswordChange).toHaveBeenCalledWith("s3cret");
    });
  });

  describe("File input", () => {
    it("renders a button that triggers the hidden file input instead of a bare native input", () => {
      renderFields();
      expect(screen.getByText("fileButton")).toBeInTheDocument();
      expect(document.querySelector('input[type="file"]')).toHaveClass("hidden");
    });

    it("calls onFileChange with the selected file", () => {
      const onFileChange = jest.fn();
      renderFields({ onFileChange });
      selectBackupFile();
      expect(onFileChange).toHaveBeenCalledWith(expect.any(File));
    });

    it("shows the selected file name once a file is chosen", () => {
      renderFields();
      selectBackupFile();
      expect(screen.getByText("backup.zip")).toBeInTheDocument();
    });

    it("calls onFileChange with null when the selection is cleared", () => {
      const onFileChange = jest.fn();
      renderFields({ onFileChange });
      fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [] } });
      expect(onFileChange).toHaveBeenCalledWith(null);
    });
  });
});
