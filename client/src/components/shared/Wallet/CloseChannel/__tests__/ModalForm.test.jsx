import { fireEvent, screen } from "@testing-library/react";

import { renderWithinModal } from "@test-utils/renderWithinModal";

import { ModalForm } from "../ModalForm";

function buildForm(overrides = {}) {
  return {
    address: "",
    feerate: "",
    errors: {},
    onAddressChange: jest.fn(),
    onFeerateChange: jest.fn(),
    ...overrides,
  };
}

function renderModal(props = {}) {
  return renderWithinModal(
    <ModalForm
      form={buildForm()}
      isLoading={false}
      onCancel={jest.fn()}
      onNext={jest.fn()}
      {...props}
    />,
  );
}

describe("ModalForm", () => {
  it("shows the address and feerate inputs", () => {
    renderModal();

    expect(screen.getByLabelText("closeChannel.addressLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("closeChannel.feerateLabel")).toBeInTheDocument();
  });

  it("shows the current address and feerate values", () => {
    renderModal({ form: buildForm({ address: "bc1qxyz", feerate: "10" }) });

    expect(screen.getByLabelText("closeChannel.addressLabel")).toHaveValue("bc1qxyz");
    expect(screen.getByLabelText("closeChannel.feerateLabel")).toHaveValue(10);
  });

  it("shows validation errors", () => {
    renderModal({
      form: buildForm({
        errors: {
          address: "closeChannel.validationAddressInvalid",
          feerate: "closeChannel.validationFeerateInvalid",
        },
      }),
    });

    expect(screen.getByText("closeChannel.validationAddressInvalid")).toBeInTheDocument();
    expect(screen.getByText("closeChannel.validationFeerateInvalid")).toBeInTheDocument();
  });

  it("disables both inputs while loading", () => {
    renderModal({ isLoading: true });

    expect(screen.getByLabelText("closeChannel.addressLabel")).toBeDisabled();
    expect(screen.getByLabelText("closeChannel.feerateLabel")).toBeDisabled();
  });

  it("calls onAddressChange when the address input changes", () => {
    const onAddressChange = jest.fn();
    renderModal({ form: buildForm({ onAddressChange }) });

    fireEvent.change(screen.getByLabelText("closeChannel.addressLabel"), {
      target: { value: "bc1qnew" },
    });

    expect(onAddressChange).toHaveBeenCalledWith("bc1qnew");
  });

  it("calls onFeerateChange when the feerate input changes", () => {
    const onFeerateChange = jest.fn();
    renderModal({ form: buildForm({ onFeerateChange }) });

    fireEvent.change(screen.getByLabelText("closeChannel.feerateLabel"), {
      target: { value: "15" },
    });

    expect(onFeerateChange).toHaveBeenCalledWith("15");
  });

  it("calls onCancel when the cancel button is clicked", () => {
    const onCancel = jest.fn();
    renderModal({ onCancel });

    fireEvent.click(screen.getByText("closeChannel.cancelButton"));

    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onNext when the next button is clicked", () => {
    const onNext = jest.fn();
    renderModal({ onNext });

    fireEvent.click(screen.getByText("closeChannel.nextButton"));

    expect(onNext).toHaveBeenCalled();
  });
});
