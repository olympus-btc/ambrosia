import MockedImage from "next/image";

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import { ImageUploader } from "../ImageUploader";

jest.mock("lucide-react", () => ({
  Upload: () => <span data-testid="upload-icon" />,
  X: () => <span data-testid="x-icon" />,
}));

jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, className, isIconOnly, size, color, variant, fullWidth, "data-testid": testId }) => (
    <button onClick={onPress} className={className} data-icon-only={isIconOnly} data-size={size} data-color={color} data-variant={variant} data-full-width={fullWidth} data-testid={testId}>
      {children}
    </button>
  ),
  Image: ({ src, alt, className }) => <MockedImage src={src} alt={alt} className={className} />,
}));

const defaultProps = {
  title: "Upload Logo",
  uploadText: "Click to upload",
  uploadDescription: "PNG, JPG up to 2MB",
  onChange: jest.fn(),
  value: null,
};

function makeFile(name = "logo.png", type = "image/png") {
  return new File(["content"], name, { type });
}

beforeEach(() => {
  jest.clearAllMocks();

  global.FileReader = class {
    constructor() {
      this.result = "data:image/png;base64,abc";
    }
    readAsDataURL() {
      this.onloadend?.();
    }
  };
});

describe("ImageUploader", () => {
  describe("upload area", () => {
    it("renders the title", () => {
      render(<ImageUploader {...defaultProps} />);
      expect(screen.getByText("Upload Logo")).toBeInTheDocument();
    });

    it("renders upload text and description", () => {
      render(<ImageUploader {...defaultProps} />);
      expect(screen.getByText("Click to upload")).toBeInTheDocument();
      expect(screen.getByText("PNG, JPG up to 2MB")).toBeInTheDocument();
    });

    it("renders the upload icon", () => {
      render(<ImageUploader {...defaultProps} />);
      expect(screen.getByTestId("upload-icon")).toBeInTheDocument();
    });

    it("renders a hidden file input", () => {
      render(<ImageUploader {...defaultProps} />);
      const input = document.querySelector("input[type='file']");
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass("hidden");
      expect(input).toHaveAttribute("accept", "image/*");
    });
  });

  describe("file selection", () => {
    it("calls onChange with the selected file", async () => {
      const onChange = jest.fn();
      render(<ImageUploader {...defaultProps} onChange={onChange} />);

      const input = document.querySelector("input[type='file']");
      const file = makeFile();

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(onChange).toHaveBeenCalledWith(file);
    });

    it("does not call onChange when no file is selected", async () => {
      const onChange = jest.fn();
      render(<ImageUploader {...defaultProps} onChange={onChange} />);

      const input = document.querySelector("input[type='file']");

      await act(async () => {
        fireEvent.change(input, { target: { files: [] } });
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("preview", () => {
    it("shows preview image when value is a string URL", () => {
      render(<ImageUploader {...defaultProps} value="https://example.com/logo.png" />);
      expect(screen.getByAltText("Image preview")).toBeInTheDocument();
    });

    it("shows preview after selecting a file", async () => {
      render(<ImageUploader {...defaultProps} />);

      const input = document.querySelector("input[type='file']");
      const file = makeFile();

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByAltText("Image preview")).toBeInTheDocument();
      });
    });

    it("shows the filename when value is a File", async () => {
      const file = makeFile("my-logo.png");

      await act(async () => {
        render(<ImageUploader {...defaultProps} value={file} />);
      });

      expect(screen.getByText("my-logo.png")).toBeInTheDocument();
    });

    it("does not show filename when value is a string URL", () => {
      render(<ImageUploader {...defaultProps} value="https://example.com/logo.png" />);
      expect(screen.queryByText("logo.png")).not.toBeInTheDocument();
    });

    it("shows the remove button when preview is visible", () => {
      render(<ImageUploader {...defaultProps} value="https://example.com/logo.png" />);
      expect(screen.getByTestId("remove-image-button")).toBeInTheDocument();
    });
  });

  describe("remove image", () => {
    it("calls onChange with null when remove is clicked", () => {
      const onChange = jest.fn();
      render(<ImageUploader {...defaultProps} onChange={onChange} value="https://example.com/logo.png" />);

      fireEvent.click(screen.getByTestId("remove-image-button"));

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("hides preview after remove is clicked", async () => {
      const onChange = jest.fn();
      const { rerender } = render(
        <ImageUploader {...defaultProps} onChange={onChange} value="https://example.com/logo.png" />,
      );

      fireEvent.click(screen.getByTestId("remove-image-button"));

      rerender(<ImageUploader {...defaultProps} onChange={onChange} value={null} />);

      await waitFor(() => {
        expect(screen.queryByAltText("Image preview")).not.toBeInTheDocument();
      });
    });
  });
});
