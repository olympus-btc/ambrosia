import { fireEvent, render, screen } from "@testing-library/react";

import { LogoImageSection, LogoSourceSelect } from "../LogoSource";

jest.mock("@heroui/react", () => ({
  Select: ({ label: selectLabel, children: selectOptions, onChange, selectedKeys }) => (
    <label>
      {selectLabel}
      <select aria-label={selectLabel} onChange={onChange} value={(selectedKeys && selectedKeys[0]) ?? ""}>
        {selectOptions}
      </select>
    </label>
  ),
  SelectItem: ({ value: optionValue, children: optionLabel }) => <option value={optionValue}>{optionLabel}</option>,
}));

jest.mock("@components/shared/ImageUploader", () => ({
  ImageUploader: ({ image, onChange, uploadText, isCompact }) => (
    <button
      type="button"
      data-testid="image-uploader"
      data-image={image ?? ""}
      data-compact={String(isCompact)}
      onClick={() => onChange(null)}
    >
      {uploadText}
    </button>
  ),
}));

const settingsTranslations = (key) => key;

function renderLogoImageSection(sectionProps) {
  return render(
    <LogoImageSection
      logoSource="BUSINESS_LOGO"
      templateText=""
      businessConfig={{ businessLogoUrl: "/uploads/2026-10/alice.png" }}
      onLogoImageChange={jest.fn()}
      isUploading={false}
      uploadErrorKey={null}
      uploaderResetKey={0}
      settingsTranslations={settingsTranslations}
      {...sectionProps}
    />,
  );
}

describe("LogoSourceSelect", () => {
  it("selects the logo source", () => {
    const onLogoSourceChange = jest.fn();
    render(
      <LogoSourceSelect logoSource="BUSINESS_LOGO" onLogoSourceChange={onLogoSourceChange} settingsTranslations={settingsTranslations} />,
    );

    expect(screen.getByLabelText("templates.logo.sourceLabel")).toHaveValue("BUSINESS_LOGO");
    fireEvent.change(screen.getByLabelText("templates.logo.sourceLabel"), { target: { value: "CUSTOM_IMAGE" } });
    expect(onLogoSourceChange).toHaveBeenCalledWith("CUSTOM_IMAGE");
  });
});

describe("LogoImageSection", () => {
  it("renders nothing for a printable business logo", () => {
    const { container: logoSectionContainer } = renderLogoImageSection();
    expect(logoSectionContainer.firstChild).toBeEmptyDOMElement();
  });

  it("warns when the business has no logo", () => {
    renderLogoImageSection({ businessConfig: {} });
    expect(screen.getByText("templates.logo.missingBusinessLogo")).toBeInTheDocument();
  });

  it("warns when the business logo is WebP", () => {
    renderLogoImageSection({ businessConfig: { businessLogoUrl: "/uploads/2026-10/alice.webp" } });
    expect(screen.getByText("templates.logo.unprintableBusinessLogo")).toBeInTheDocument();
  });

  it("shows the compact shared uploader with the chosen image for a custom logo", () => {
    const onLogoImageChange = jest.fn();
    renderLogoImageSection({ logoSource: "CUSTOM_IMAGE", templateText: "/uploads/2026-10/bob.png", onLogoImageChange });

    const imageUploader = screen.getByTestId("image-uploader");
    expect(imageUploader).toHaveAttribute("data-image", "/uploads/2026-10/bob.png");
    expect(imageUploader).toHaveAttribute("data-compact", "true");
    expect(imageUploader).toHaveTextContent("templates.logo.chooseImage");

    fireEvent.click(imageUploader);
    expect(onLogoImageChange).toHaveBeenCalledWith(null);
  });

  it("shows the uploading state and upload errors", () => {
    renderLogoImageSection({ logoSource: "CUSTOM_IMAGE", isUploading: true, uploadErrorKey: "templates.logo.uploadError" });
    expect(screen.getByText("templates.logo.uploading")).toBeInTheDocument();
    expect(screen.getByText("templates.logo.uploadError")).toBeInTheDocument();
  });
});
