import { addToast } from "@heroui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { usePrinters } from "@components/pages/Store/hooks/usePrinter";
import { useTemplates } from "@components/pages/Store/hooks/useTemplates";

import { TicketTemplatesModal } from "../Modal";

jest.mock("@/hooks/usePermission");

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
  MouseSensor: jest.fn(),
  TouchSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock("@components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress, children }) => (
    <button type="button" onClick={onPress}>
      {children}
    </button>
  ),
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

jest.mock("@components/pages/Store/hooks/usePrinter", () => ({
  usePrinters: jest.fn(),
}));

jest.mock("@components/pages/Store/hooks/useTemplates", () => ({
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
      dateFormat: "MONTH_DAY_YEAR",
      timeFormat: "HOURS_12",
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
    expect(screen.getByLabelText("templates.dateFormatLabel")).toHaveValue("MONTH_DAY_YEAR");
    expect(screen.getByLabelText("templates.timeFormatLabel")).toHaveValue("HOURS_12");
    expect(screen.getByText("Ambrosia")).toBeInTheDocument();
    expect(screen.getByText("2x burger")).toBeInTheDocument();
    expect(screen.getByText("lnbc10u1p0exampleinvoice")).toBeInTheDocument();

    fireEvent.click(screen.getByText("templates.saveChanges"));

    await waitFor(() => expect(updateTemplate).toHaveBeenCalledWith("tpl-1", {
      name: "Kitchen",
      ticketType: "RECEIPT",
      dateFormat: "MONTH_DAY_YEAR",
      timeFormat: "HOURS_12",
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
      templates: [{ id: "tpl-2", name: "Menu", elements: [], ticketType: "RECEIPT", isDefault: true }],
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
      ticketType: "RECEIPT",
      dateFormat: "DAY_MONTH_YEAR",
      timeFormat: "HOURS_24",
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
    await waitFor(() => expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ color: "success", description: "templates.deleteSuccess" }),
    ));
    expect(screen.getByLabelText("templates.nameLabel")).toHaveValue("");
  });

  it("shows a success toast when print test succeeds", async () => {
    const printTicket = jest.fn().mockResolvedValue(true);

    useTemplates.mockReturnValue({
      templates: [{ id: "tpl-1", name: "Customer", elements: [] }],
      loading: false,
      error: null,
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
    });

    usePrinters.mockReturnValue({ printTicket });

    render(<TicketTemplatesModal isOpen onClose={jest.fn()} />);

    fireEvent.change(screen.getByLabelText("templates.nameLabel"), {
      target: { value: "Customer" },
    });

    fireEvent.click(screen.getByText("templates.printTest"));

    await waitFor(() => expect(printTicket).toHaveBeenCalledWith(expect.objectContaining({
      ticketData: expect.objectContaining({
        tableName: "tableName",
        paymentMethod: "cash",
        labels: { total: "labels.total", discount: "labels.discount", tip: "labels.tip", paymentMethod: "labels.paymentMethod" },
      }),
    })));
    await waitFor(() => expect(addToast).toHaveBeenCalledWith({
      title: "templates.printSuccessTitle",
      description: "templates.printSuccessDescription",
      color: "success",
    }));
  });

  it("shows an error toast when deleting a template fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const deleteTemplate = jest.fn().mockRejectedValue(new Error("delete failed"));
    const initialTemplate = {
      id: "tpl-fail",
      name: "Failing Template",
      elements: [],
    };

    useTemplates.mockReturnValue({
      templates: [initialTemplate],
      loading: false,
      error: null,
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate,
    });

    usePrinters.mockReturnValue({ printTicket: jest.fn() });

    render(
      <TicketTemplatesModal
        isOpen
        onClose={jest.fn()}
        initialTemplate={initialTemplate}
      />,
    );

    fireEvent.click(screen.getByText("templates.deleteTemplate"));
    await waitFor(() => expect(screen.getByText("templates.confirmDelete")).toBeInTheDocument());
    fireEvent.click(screen.getByText("templates.confirmDelete"));

    await waitFor(() => expect(deleteTemplate).toHaveBeenCalledWith("tpl-fail"));
    await waitFor(() => expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ color: "danger", description: "templates.deleteError" }),
    ));
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

  it("saves the selected date and time formats and previews them", async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 15, 21, 30) });
    const createTemplate = jest.fn().mockResolvedValue({ id: "tpl-alice" });

    useTemplates.mockReturnValue({
      templates: [],
      loading: false,
      error: null,
      createTemplate,
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
    });

    usePrinters.mockReturnValue({ printTicket: jest.fn() });

    render(
      <TicketTemplatesModal
        isOpen
        onClose={jest.fn()}
        initialTemplate={{
          name: "alice",
          elements: [{ id: "e-alice", type: "TEXT", value: "{{print.date}} {{print.time}}", style: {} }],
        }}
      />,
    );

    expect(screen.getByText("15/10/2026 21:30")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("templates.dateFormatLabel"), {
      target: { value: "YEAR_MONTH_DAY" },
    });
    fireEvent.change(screen.getByLabelText("templates.timeFormatLabel"), {
      target: { value: "HOURS_12" },
    });

    expect(screen.getByText("2026-10-15 9:30 PM")).toBeInTheDocument();

    fireEvent.click(screen.getByText("templates.saveNew"));
    jest.useRealTimers();

    await waitFor(() => expect(createTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ dateFormat: "YEAR_MONTH_DAY", timeFormat: "HOURS_12" }),
    ));
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

  it("starts a Z report template with the default layout and prints it with sample shift data", async () => {
    const printTicket = jest.fn().mockResolvedValue(true);
    useTemplates.mockReturnValue({
      templates: [{ id: "tpl-alice", name: "alice", elements: [], ticketType: "SHIFT_CLOSE", isDefault: true }],
      loading: false,
      error: null,
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      setDefaultTemplate: jest.fn(),
    });
    usePrinters.mockReturnValue({ printTicket });

    render(<TicketTemplatesModal isOpen onClose={jest.fn()} />);

    fireEvent.change(screen.getByLabelText("templates.ticketTypeLabel"), { target: { value: "SHIFT_CLOSE" } });
    fireEvent.change(screen.getByLabelText("templates.nameLabel"), { target: { value: "alice" } });

    expect(screen.getByText("templates.elementTypes.SHIFT_SUMMARY")).toBeInTheDocument();

    fireEvent.click(screen.getByText("templates.printTest"));

    await waitFor(() => expect(printTicket).toHaveBeenCalledWith(expect.objectContaining({
      templateName: "alice",
      ticketType: "SHIFT_CLOSE",
      shiftReport: expect.objectContaining({ cashierName: "cashier" }),
      forceTemplateName: true,
    })));
    expect(printTicket.mock.calls[0][0]).not.toHaveProperty("ticketData");
  });

  it("sets an existing template as the default of its ticket type", async () => {
    const setDefaultTemplate = jest.fn().mockResolvedValue(true);
    useTemplates.mockReturnValue({
      templates: [],
      loading: false,
      error: null,
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      setDefaultTemplate,
    });
    usePrinters.mockReturnValue({ printTicket: jest.fn() });

    render(
      <TicketTemplatesModal
        isOpen
        onClose={jest.fn()}
        initialTemplate={{ id: "tpl-bob", name: "bob", elements: [], ticketType: "SHIFT_CLOSE", isDefault: false }}
      />,
    );

    fireEvent.click(screen.getByText("templates.setDefault"));

    await waitFor(() => expect(setDefaultTemplate).toHaveBeenCalledWith("tpl-bob"));
    await waitFor(() => expect(screen.getByText("templates.defaultBadge")).toBeInTheDocument());
    expect(screen.queryByText("templates.setDefault")).not.toBeInTheDocument();
    expect(addToast).toHaveBeenCalledWith({ color: "success", description: "templates.setDefaultSuccess" });
  });

  it("does not offer to delete the default template", () => {
    useTemplates.mockReturnValue({
      templates: [],
      loading: false,
      error: null,
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      setDefaultTemplate: jest.fn(),
    });
    usePrinters.mockReturnValue({ printTicket: jest.fn() });

    render(
      <TicketTemplatesModal
        isOpen
        onClose={jest.fn()}
        initialTemplate={{ id: "tpl-eve", name: "eve", elements: [], ticketType: "RECEIPT", isDefault: true }}
      />,
    );

    expect(screen.getByText("templates.defaultBadge")).toBeInTheDocument();
    expect(screen.queryByText("templates.deleteTemplate")).not.toBeInTheDocument();
  });
});
