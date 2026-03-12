import { addToast } from "@heroui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { usePrinters } from "../../hooks/usePrinter";
import { useTemplates } from "../../hooks/useTemplates";
import { TicketTemplatesModal } from "../TicketTemplate/Modal";

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
  Button: ({ onPress, isDisabled, children, isIconOnly, ...props }) => (
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

jest.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }) => <>{children}</>,
  closestCenter: jest.fn(),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }) => <>{children}</>,
  sortableKeyboardCoordinates: jest.fn(),
  verticalListSortingStrategy: jest.fn(),
  arrayMove: jest.fn((arr, from, to) => {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  }),
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

jest.mock("@providers/configurations/configurationsProvider", () => ({
  useConfigurations: jest.fn(() => ({
    config: {
      businessName: "Ambrosia",
      businessAddress: "Calle Principal 123",
      businessPhone: "+52 555 1234567",
      businessEmail: "contact@ambrosia.mx",
    },
  })),
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

    await waitFor(() => expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ color: "success", description: "templates.saveSuccess" }),
    ));
  });

  it("creates, prints with error, and deletes a template", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
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
        printerType: "CUSTOMER",
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

    await waitFor(() => expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ color: "success", description: "templates.saveSuccess" }),
    ));

    await waitFor(() => expect(screen.getByText("templates.deleteTemplate")).toBeInTheDocument());

    fireEvent.click(screen.getByText("templates.deleteTemplate"));
    await waitFor(() => expect(screen.getByText("templates.confirmDelete")).toBeInTheDocument());
    fireEvent.click(screen.getByText("templates.confirmDelete"));

    await waitFor(() => expect(deleteTemplate).toHaveBeenCalledWith("tpl-new"));
    expect(screen.getByLabelText("templates.nameLabel")).toHaveValue("");
  });

  it("collapses elements by default, expands on click, remove and add work", async () => {
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

    expect(screen.queryByLabelText("templates.elementValueLabel")).toBeNull();

    const typeLabels = screen.getAllByText("templates.elementTypes.TEXT");
    fireEvent.click(typeLabels[0]);

    const valueInput = screen.getByLabelText("templates.elementValueLabel");
    expect(valueInput).toHaveValue("Hello");
    fireEvent.change(valueInput, { target: { value: "Updated" } });

    expect(screen.getAllByRole("button", { name: "templates.removeElement" })).toHaveLength(3);
    fireEvent.click(screen.getAllByRole("button", { name: "templates.removeElement" })[0]);
    expect(screen.getAllByRole("button", { name: "templates.removeElement" })).toHaveLength(2);

    fireEvent.click(screen.getByText("templates.addElement"));
    await waitFor(() => expect(screen.getAllByLabelText("templates.elementTypeLabel").length).toBeGreaterThan(0),
    );

    fireEvent.change(screen.getByLabelText("templates.printTypeLabel"), {
      target: { value: "CUSTOMER" },
    });
    expect(screen.getByText("cardPrinters.types.CUSTOMER")).toBeInTheDocument();
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
