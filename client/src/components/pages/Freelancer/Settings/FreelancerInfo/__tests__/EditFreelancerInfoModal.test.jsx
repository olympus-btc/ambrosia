import { fireEvent, render, screen } from "@testing-library/react";

import { EditFreelancerInfoModal } from "../EditFreelancerInfoModal";

jest.mock("@components/shared/TimezoneInput", () => ({
  TimezoneInput: ({ label: timezoneInputLabel, onSelectionChange }) => (
    <select aria-label={timezoneInputLabel} onChange={(changeEvent) => onSelectionChange(changeEvent.target.value || null)}>
      <option value="" />
      <option value="Europe/Madrid">Europe/Madrid</option>
    </select>
  ),
}));

jest.mock("@components/shared/ImageUploader", () => ({
  ImageUploader: ({ title: imageUploaderTitle, onChange: onImageChange }) => (
    <button type="button" onClick={() => onImageChange(null)}>{imageUploaderTitle}</button>
  ),
}));

const aliceDraft = {
  businessName: "Alice Studio",
  businessProfession: "Graphic Designer",
  businessTaxId: "",
  businessAddress: "",
  businessEmail: "",
  businessPhone: "",
  timezone: "America/Mexico_City",
};

function renderModal(modalProps = {}) {
  const onDraftChange = jest.fn();
  render(
    <EditFreelancerInfoModal
      draftBusinessInfo={aliceDraft}
      onDraftChange={onDraftChange}
      onSubmit={jest.fn((submitEvent) => submitEvent.preventDefault())}
      isOpen
      onClose={jest.fn()}
      {...modalProps}
    />,
  );
  return onDraftChange;
}

describe("EditFreelancerInfoModal", () => {
  it("renders nothing without a draft", () => {
    const { container } = render(
      <EditFreelancerInfoModal draftBusinessInfo={null} onDraftChange={jest.fn()} onSubmit={jest.fn()} isOpen onClose={jest.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("reports each edited text field", () => {
    const onDraftChange = renderModal();

    fireEvent.change(screen.getByLabelText("infoModal.name"), { target: { value: "Bob Studio" } });
    fireEvent.change(screen.getByLabelText("infoModal.profession"), { target: { value: "Illustrator" } });
    fireEvent.change(screen.getByLabelText("infoModal.address"), { target: { value: "Main Street 123" } });
    fireEvent.change(screen.getByLabelText("infoModal.email"), { target: { value: "bob@example.com" } });

    expect(onDraftChange).toHaveBeenCalledWith({ businessName: "Bob Studio" });
    expect(onDraftChange).toHaveBeenCalledWith({ businessProfession: "Illustrator" });
    expect(onDraftChange).toHaveBeenCalledWith({ businessAddress: "Main Street 123" });
    expect(onDraftChange).toHaveBeenCalledWith({ businessEmail: "bob@example.com" });
  });

  it("uppercases the tax ID and keeps only digits in the phone", () => {
    const onDraftChange = renderModal();

    fireEvent.change(screen.getByLabelText("infoModal.taxId"), { target: { value: "bob800101ab1" } });
    fireEvent.change(screen.getByLabelText("infoModal.phone"), { target: { value: "55-5123 4567" } });

    expect(onDraftChange).toHaveBeenCalledWith({ businessTaxId: "BOB800101AB1" });
    expect(onDraftChange).toHaveBeenCalledWith({ businessPhone: "5551234567" });
  });

  it("reports the selected timezone and ignores a cleared selection", () => {
    const onDraftChange = renderModal();

    fireEvent.change(screen.getByLabelText("infoModal.timezone"), { target: { value: "Europe/Madrid" } });
    fireEvent.change(screen.getByLabelText("infoModal.timezone"), { target: { value: "" } });

    expect(onDraftChange).toHaveBeenCalledTimes(1);
    expect(onDraftChange).toHaveBeenCalledWith({ timezone: "Europe/Madrid" });
  });

  it("marks the logo as removed when the uploader clears it", () => {
    const onDraftChange = renderModal();

    fireEvent.click(screen.getByText("infoModal.logo"));

    expect(onDraftChange).toHaveBeenCalledWith({ businessLogo: null, businessLogoRemoved: true });
  });
});
