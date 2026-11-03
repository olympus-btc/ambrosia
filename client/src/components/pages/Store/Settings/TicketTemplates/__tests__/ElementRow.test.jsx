import { fireEvent, render, screen } from "@testing-library/react";

import { TemplateElementRow } from "../ElementRow";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children: buttonContent, "aria-label": ariaLabel, isIconOnly, ...buttonProps }) => (
    <button type="button" onClick={onPress} aria-label={ariaLabel} {...buttonProps}>
      {buttonContent}
    </button>
  ),
  Input: ({ label: inputLabel, value: inputValue, onChange, onSelect, endContent }) => (
    <label>
      {inputLabel}
      <input aria-label={inputLabel} value={inputValue ?? ""} onChange={onChange} onSelect={onSelect} />
      {endContent}
    </label>
  ),
  Select: ({ label: selectLabel, children: selectOptions, onChange, selectedKeys }) => (
    <label>
      {selectLabel}
      <select
        aria-label={selectLabel}
        onChange={onChange}
        value={(selectedKeys && selectedKeys[0]) ?? ""}
      >
        {selectOptions}
      </select>
    </label>
  ),
  SelectItem: ({ value: optionValue, children: optionLabel }) => (
    <option value={optionValue}>{optionLabel}</option>
  ),
  Tooltip: ({ children: tooltipTrigger }) => <>{tooltipTrigger}</>,
}));

jest.mock("@components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress }) => (
    <button type="button" data-testid="delete-button" onClick={onPress}>
      delete
    </button>
  ),
}));

jest.mock("@components/hooks/useUpload", () => ({
  useUpload: () => ({ upload: jest.fn(), isUploading: false }),
}));

jest.mock("../LogoSource", () => ({
  LogoSourceSelect: ({ logoSource, onLogoSourceChange }) => (
    <button
      type="button"
      data-testid="logo-source-select"
      data-logo-source={logoSource}
      onClick={() => onLogoSourceChange("BUSINESS_LOGO")}
    >
      logo source
    </button>
  ),
  LogoImageSection: ({ templateText }) => (
    <div data-testid="logo-image-section" data-template-text={templateText} />
  ),
}));

jest.mock("../VariablePicker", () => ({
  TemplateVariablePicker: ({ onSelect, onDeselect }) => (
    <>
      <button
        type="button"
        data-testid="variable-picker"
        onClick={() => onSelect("{{config.businessName}}")}
      >
        picker
      </button>
      <button
        type="button"
        data-testid="variable-deselect"
        onClick={() => onDeselect("{{print.date}}")}
      >
        deselect
      </button>
    </>
  ),
}));

jest.mock("@dnd-kit/sortable", () => ({
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

jest.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: jest.fn(() => "") } },
}));

const settingsTranslations = (key) => key;

const textTemplateElement = {
  localId: "el-1",
  type: "TEXT",
  value: "",
  style: { bold: false, justification: "LEFT", fontSize: "NORMAL" },
};

describe("TemplateElementRow", () => {
  it("updates element fields and toggles bold when expanded", () => {
    const onChange = jest.fn();
    const onRemove = jest.fn();

    render(
      <TemplateElementRow
        templateElement={textTemplateElement}
        isOpen
        onToggle={jest.fn()}
        onChange={onChange}
        onRemove={onRemove}
        businessConfig={null}
        settingsTranslations={settingsTranslations}
      />,
    );

    fireEvent.change(screen.getByLabelText("templates.elementValueLabel"), {
      target: { value: "Hello" },
    });
    expect(onChange).toHaveBeenCalledWith({ ...textTemplateElement, value: "Hello" });

    fireEvent.change(screen.getByLabelText("templates.elementTypeLabel"), {
      target: { value: "HEADER" },
    });
    expect(onChange).toHaveBeenCalledWith({ ...textTemplateElement, type: "HEADER" });

    fireEvent.change(screen.getByLabelText("templates.justificationLabel"), {
      target: { value: "RIGHT" },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...textTemplateElement,
      style: { ...textTemplateElement.style, justification: "RIGHT" },
    });

    fireEvent.change(screen.getByLabelText("templates.fontSizeLabel"), {
      target: { value: "LARGE" },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...textTemplateElement,
      style: { ...textTemplateElement.style, fontSize: "LARGE" },
    });

    fireEvent.click(screen.getByRole("button", { name: "templates.boldToggle" }));
    expect(onChange).toHaveBeenCalledWith({
      ...textTemplateElement,
      style: { ...textTemplateElement.style, bold: true },
    });

    fireEvent.click(screen.getByTestId("delete-button"));
    expect(onRemove).toHaveBeenCalledWith("el-1");
  });

  it("collapses fields by default and shows them on toggle", () => {
    const onToggle = jest.fn();

    render(
      <TemplateElementRow
        templateElement={textTemplateElement}
        isOpen={false}
        onToggle={onToggle}
        onChange={jest.fn()}
        onRemove={jest.fn()}
        businessConfig={null}
        settingsTranslations={settingsTranslations}
      />,
    );

    expect(screen.queryByLabelText("templates.elementValueLabel")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "templates.expand" }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("hides value and style controls for line breaks", () => {
    render(
      <TemplateElementRow
        templateElement={{ localId: "el-2", type: "LINE_BREAK", value: "", style: {} }}
        isOpen
        onToggle={jest.fn()}
        onChange={jest.fn()}
        onRemove={jest.fn()}
        businessConfig={null}
        settingsTranslations={settingsTranslations}
      />,
    );

    expect(screen.queryByLabelText("templates.elementValueLabel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("templates.justificationLabel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("templates.fontSizeLabel")).not.toBeInTheDocument();
  });

  it.each(["HEADER", "TEXT", "FOOTER"])(
    "shows variable picker for %s type",
    (type) => {
      render(
        <TemplateElementRow
          templateElement={{ localId: "el-3", type, value: "", style: {} }}
          isOpen
          onToggle={jest.fn()}
          onChange={jest.fn()}
          onRemove={jest.fn()}
          businessConfig={null}
          settingsTranslations={settingsTranslations}
        />,
      );
      expect(screen.getByTestId("variable-picker")).toBeInTheDocument();
    },
  );

  it.each(["QRCODE", "TABLE_HEADER"])(
    "hides variable picker for %s type",
    (type) => {
      render(
        <TemplateElementRow
          templateElement={{ localId: "el-4", type, value: "", style: {} }}
          isOpen
          onToggle={jest.fn()}
          onChange={jest.fn()}
          onRemove={jest.fn()}
          businessConfig={null}
          settingsTranslations={settingsTranslations}
        />,
      );
      expect(screen.queryByTestId("variable-picker")).not.toBeInTheDocument();
    },
  );

  it("selecting a variable appends it when the cursor was never placed", () => {
    const onChange = jest.fn();
    render(
      <TemplateElementRow
        templateElement={{ localId: "el-5", type: "TEXT", value: "Welcome to", style: {} }}
        isOpen
        onToggle={jest.fn()}
        onChange={onChange}
        onRemove={jest.fn()}
        businessConfig={null}
        settingsTranslations={settingsTranslations}
      />,
    );
    fireEvent.click(screen.getByTestId("variable-picker"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ value: "Welcome to {{config.businessName}}" }),
    );
  });

  it("deselecting a variable removes every occurrence from the value", () => {
    const onChange = jest.fn();
    render(
      <TemplateElementRow
        templateElement={{ localId: "el-7", type: "TEXT", value: "{{print.date}} {{print.date}} {{print.time}}", style: {} }}
        isOpen
        onToggle={jest.fn()}
        onChange={onChange}
        onRemove={jest.fn()}
        businessConfig={null}
        settingsTranslations={settingsTranslations}
      />,
    );
    fireEvent.click(screen.getByTestId("variable-deselect"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ value: "{{print.time}}" }),
    );
  });

  it("selecting a variable inserts it at the cursor", () => {
    const onChange = jest.fn();
    render(
      <TemplateElementRow
        templateElement={{ localId: "el-6", type: "TEXT", value: "Hi alice!", style: {} }}
        isOpen
        onToggle={jest.fn()}
        onChange={onChange}
        onRemove={jest.fn()}
        businessConfig={null}
        settingsTranslations={settingsTranslations}
      />,
    );
    const valueInput = screen.getByLabelText("templates.elementValueLabel");
    valueInput.setSelectionRange(3, 8);
    fireEvent.select(valueInput);
    fireEvent.click(screen.getByTestId("variable-picker"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ value: "Hi {{config.businessName}}!" }),
    );
  });

  it("shows the logo source and image section instead of the value input and bold toggle for LOGO", () => {
    const onChange = jest.fn();
    render(
      <TemplateElementRow
        templateElement={{ localId: "el-8", type: "LOGO", value: "/uploads/2026-10/alice.png", style: {} }}
        isOpen
        onToggle={jest.fn()}
        onChange={onChange}
        onRemove={jest.fn()}
        businessConfig={null}
        settingsTranslations={settingsTranslations}
      />,
    );
    expect(screen.queryByLabelText("templates.elementValueLabel")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "templates.boldToggle" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("templates.fontSizeLabel")).toBeInTheDocument();
    expect(screen.getByTestId("logo-source-select")).toHaveAttribute("data-logo-source", "CUSTOM_IMAGE");
    expect(screen.getByTestId("logo-image-section")).toHaveAttribute("data-template-text", "/uploads/2026-10/alice.png");

    fireEvent.click(screen.getByTestId("logo-source-select"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ value: "" }));
  });

  it("clears the value when switching an element to LOGO", () => {
    const onChange = jest.fn();
    render(
      <TemplateElementRow
        templateElement={{ localId: "el-9", type: "TEXT", value: "Hi bob", style: {} }}
        isOpen
        onToggle={jest.fn()}
        onChange={onChange}
        onRemove={jest.fn()}
        businessConfig={null}
        settingsTranslations={settingsTranslations}
      />,
    );
    fireEvent.change(screen.getByLabelText("templates.elementTypeLabel"), { target: { value: "LOGO" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: "LOGO", value: "" }));
  });

  it("fills the default label when switching an empty element to PAYMENT_METHOD", () => {
    const onChange = jest.fn();
    render(
      <TemplateElementRow
        templateElement={{ localId: "el-10", type: "TEXT", value: "", style: {} }}
        isOpen
        onToggle={jest.fn()}
        onChange={onChange}
        onRemove={jest.fn()}
        businessConfig={null}
        settingsTranslations={settingsTranslations}
      />,
    );
    fireEvent.change(screen.getByLabelText("templates.elementTypeLabel"), { target: { value: "PAYMENT_METHOD" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PAYMENT_METHOD", value: "templates.paymentMethodDefaultLabel" }),
    );
  });

  it("keeps the existing value when switching an element to PAYMENT_METHOD", () => {
    const onChange = jest.fn();
    render(
      <TemplateElementRow
        templateElement={{ localId: "el-11", type: "TEXT", value: "Pagado con", style: {} }}
        isOpen
        onToggle={jest.fn()}
        onChange={onChange}
        onRemove={jest.fn()}
        businessConfig={null}
        settingsTranslations={settingsTranslations}
      />,
    );
    fireEvent.change(screen.getByLabelText("templates.elementTypeLabel"), { target: { value: "PAYMENT_METHOD" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: "PAYMENT_METHOD", value: "Pagado con" }));
  });

  it("hides the justification but keeps font size and bold for PAYMENT_METHOD", () => {
    render(
      <TemplateElementRow
        templateElement={{ localId: "el-12", type: "PAYMENT_METHOD", value: "Método de pago", style: {} }}
        isOpen
        onToggle={jest.fn()}
        onChange={jest.fn()}
        onRemove={jest.fn()}
        businessConfig={null}
        settingsTranslations={settingsTranslations}
      />,
    );
    expect(screen.queryByLabelText("templates.justificationLabel")).not.toBeInTheDocument();
    expect(screen.getByLabelText("templates.fontSizeLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("templates.boldToggle")).toBeInTheDocument();
  });

  it("offers the shift summary instead of the sale elements for Z report templates", () => {
    render(
      <TemplateElementRow
        templateElement={{ localId: "el-shift", type: "TEXT", value: "", style: {} }}
        ticketType="SHIFT_CLOSE"
        isOpen
        onToggle={jest.fn()}
        onChange={jest.fn()}
        onRemove={jest.fn()}
        businessConfig={null}
        settingsTranslations={settingsTranslations}
      />,
    );

    expect(screen.getByRole("option", { name: "templates.elementTypes.SHIFT_SUMMARY" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "templates.elementTypes.TABLE_ROW" })).not.toBeInTheDocument();
  });

  it("offers the sale elements but not the shift summary for receipt templates", () => {
    render(
      <TemplateElementRow
        templateElement={{ localId: "el-receipt", type: "TEXT", value: "", style: {} }}
        isOpen
        onToggle={jest.fn()}
        onChange={jest.fn()}
        onRemove={jest.fn()}
        businessConfig={null}
        settingsTranslations={settingsTranslations}
      />,
    );

    expect(screen.getByRole("option", { name: "templates.elementTypes.TABLE_ROW" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "templates.elementTypes.SHIFT_SUMMARY" })).not.toBeInTheDocument();
  });
});
