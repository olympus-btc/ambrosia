import { addToast } from "@heroui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { usePrinters } from "../../hooks/usePrinter";
import { useTemplates } from "../../hooks/useTemplates";
import { TicketTemplatesModal } from "../TicketTemplate/TicketTemplatesModal";

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ onPress, isDisabled, children, ...props }) => (
    <button
      type="button"
      onClick={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      {...props}
    >
      {children}
    </button>
  ),
  Input: ({ label, value, onChange }) => (
    <label>
      {label}
      <input aria-label={label} value={value ?? ""} onChange={onChange} />
    </label>
  ),
  Select: ({ label, children, onChange, selectedKeys }) => (
    <label>
      {label}
      <select
        aria-label={label}
        onChange={onChange}
        value={(selectedKeys && selectedKeys[0]) ?? ""}
      >
        {children}
      </select>
    </label>
  ),
  SelectItem: ({ value, children }) => (
    <option value={value}>{children}</option>
  ),
  Modal: ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null),
  ModalContent: ({ children }) => <div>{children}</div>,
  ModalHeader: ({ children }) => <div>{children}</div>,
  ModalBody: ({ children }) => <div>{children}</div>,
  ModalFooter: ({ children }) => <div>{children}</div>,
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("../../hooks/usePrinter", () => ({
  usePrinters: jest.fn(),
}));

jest.mock("../../hooks/useTemplates", () => ({
  useTemplates: jest.fn(),
}));

describe("TicketTemplatesModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads a template from initialTemplate prop, renders preview, and updates it", async () => {
    const updateTemplate = jest.fn().mockResolvedValue(true);
    const initialTemplate = {
      id: "tpl-1",
      name: "Kitchen",
      elements: [
        {
          id: "e-1",
          type: "TEXT",
          value: "{{config.businessName}}",
          style: { bold: true, justification: "CENTER", fontSize: "LARGE" },
        },
        {
          id: "e-2",
          type: "TABLE_ROW",
          value: "",
          style: { bold: false, justification: "LEFT", fontSize: "NORMAL" },
        },
        {
          id: "e-3",
          type: "QRCODE",
          value: "",
          style: { bold: false, justification: "LEFT", fontSize: "NORMAL" },
        },
      ],
    };

    useTemplates.mockReturnValue({
      templates: [initialTemplate],
      loading: false,
      error: null,
      createTemplate: jest.fn(),
      updateTemplate,
      deleteTemplate: jest.fn(),
    });

    usePrinters.mockReturnValue({ printTicket: jest.fn() });

    render(
      <TicketTemplatesModal
        isOpen
        onClose={jest.fn()}
        initialTemplate={initialTemplate}
      />,
    );

    expect(screen.getByLabelText("templates.nameLabel")).toHaveValue("Kitchen");
    expect(screen.getByText("Ambrosia")).toBeInTheDocument();
    expect(screen.getByText("2x Tacos al pastor")).toBeInTheDocument();
    expect(screen.getByText("lnbc10u1p0exampleinvoice")).toBeInTheDocument();

    fireEvent.click(screen.getByText("templates.saveChanges"));

    await waitFor(() => expect(updateTemplate).toHaveBeenCalledWith("tpl-1", {
      name: "Kitchen",
      elements: expect.any(Array),
    }),
    );
  });

  it("creates, prints with error, and deletes a template", async () => {
    const createTemplate = jest.fn().mockResolvedValue({ id: "tpl-new" });
    const deleteTemplate = jest.fn().mockResolvedValue(true);
    const printTicket = jest.fn().mockRejectedValue(new Error("fail"));

    useTemplates.mockReturnValue({
      templates: [{ id: "tpl-2", name: "Menu", elements: [] }],
      loading: false,
      error: null,
      createTemplate,
      updateTemplate: jest.fn(),
      deleteTemplate,
    });

    usePrinters.mockReturnValue({ printTicket });

    render(<TicketTemplatesModal isOpen onClose={jest.fn()} />);

    fireEvent.change(screen.getByLabelText("templates.nameLabel"), {
      target: { value: "Menu" },
    });

    fireEvent.click(screen.getByText("templates.printTest"));

    await waitFor(() => expect(printTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        templateName: "Menu",
        printerType: "KITCHEN",
        broadcast: false,
        forceTemplateName: true,
      }),
    ),
    );

    await waitFor(() => expect(addToast).toHaveBeenCalledWith({
      title: "templates.printErrorTitle",
      description: "templates.printErrorDescription",
      color: "danger",
    }),
    );

    fireEvent.change(screen.getByLabelText("templates.nameLabel"), {
      target: { value: "New Template" },
    });

    fireEvent.click(screen.getByText("templates.saveNew"));

    await waitFor(() => expect(createTemplate).toHaveBeenCalledWith({
      name: "New Template",
      elements: expect.any(Array),
    }),
    );

    await waitFor(() => expect(screen.getByText("templates.deleteTemplate")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("templates.deleteTemplate"));

    await waitFor(() => expect(deleteTemplate).toHaveBeenCalledWith("tpl-new"));
    expect(screen.getByLabelText("templates.nameLabel")).toHaveValue("");
  });

  it("edits elements, moves them, and changes printer type", async () => {
    const initialTemplate = {
      id: "tpl-3",
      name: "Breaks",
      elements: [
        { id: "sep-1", type: "SEPARATOR", value: "", style: {} },
        { id: "br-1", type: "LINE_BREAK", value: "", style: {} },
        { id: "txt-1", type: "TEXT", value: "Hello", style: {} },
      ],
    };

    useTemplates.mockReturnValue({
      templates: [initialTemplate],
      loading: false,
      error: null,
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
    });

    usePrinters.mockReturnValue({ printTicket: jest.fn() });

    const { container } = render(
      <TicketTemplatesModal
        isOpen
        onClose={jest.fn()}
        initialTemplate={initialTemplate}
      />,
    );

    expect(container.querySelector(".border-dashed")).not.toBeNull();
    expect(container.querySelector(".h-3")).not.toBeNull();

    const valueInputs = screen.getAllByLabelText("templates.elementValueLabel");
    fireEvent.change(valueInputs[valueInputs.length - 1], {
      target: { value: "Updated" },
    });

    fireEvent.click(screen.getAllByText("templates.moveUp")[0]);
    fireEvent.click(screen.getAllByText("templates.moveDown").slice(-1)[0]);

    fireEvent.click(screen.getAllByText("templates.removeElement")[0]);

    fireEvent.click(screen.getByText("templates.addElement"));

    fireEvent.change(screen.getByLabelText("templates.printTypeLabel"), {
      target: { value: "BAR" },
    });

    expect(screen.getByText("cardPrinters.types.BAR")).toBeInTheDocument();
  });

  it("opens with empty form when no initialTemplate is provided", () => {
    useTemplates.mockReturnValue({
      templates: [],
      loading: false,
      error: null,
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
    });

    usePrinters.mockReturnValue({ printTicket: jest.fn() });

    render(<TicketTemplatesModal isOpen onClose={jest.fn()} />);

    expect(screen.getByLabelText("templates.nameLabel")).toHaveValue("");
    expect(screen.getByText("templates.saveNew")).toBeInTheDocument();
  });
});
