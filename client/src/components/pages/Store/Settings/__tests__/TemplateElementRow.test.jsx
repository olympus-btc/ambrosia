import { fireEvent, render, screen } from "@testing-library/react";

import { TemplateElementRow } from "../TicketTemplate/TemplateElementRow";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, "aria-label": ariaLabel, isIconOnly, ...props }) => (
    <button type="button" onClick={onPress} aria-label={ariaLabel} {...props}>
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

const t = (key) => key;

const element = {
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
        element={element}
        isOpen
        onToggle={jest.fn()}
        onChange={onChange}
        onRemove={onRemove}
        config={null}
        t={t}
      />,
    );

    fireEvent.change(screen.getByLabelText("templates.elementValueLabel"), {
      target: { value: "Hello" },
    });
    expect(onChange).toHaveBeenCalledWith({ ...element, value: "Hello" });

    fireEvent.change(screen.getByLabelText("templates.elementTypeLabel"), {
      target: { value: "HEADER" },
    });
    expect(onChange).toHaveBeenCalledWith({ ...element, type: "HEADER" });

    fireEvent.change(screen.getByLabelText("templates.justificationLabel"), {
      target: { value: "RIGHT" },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...element,
      style: { ...element.style, justification: "RIGHT" },
    });

    fireEvent.change(screen.getByLabelText("templates.fontSizeLabel"), {
      target: { value: "LARGE" },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...element,
      style: { ...element.style, fontSize: "LARGE" },
    });

    fireEvent.click(screen.getByRole("button", { name: "templates.boldToggle" }));
    expect(onChange).toHaveBeenCalledWith({
      ...element,
      style: { ...element.style, bold: true },
    });

    fireEvent.click(screen.getByRole("button", { name: "templates.removeElement" }));
    expect(onRemove).toHaveBeenCalledWith("el-1");
  });

  it("collapses fields by default and shows them on toggle", () => {
    const onToggle = jest.fn();

    render(
      <TemplateElementRow
        element={element}
        isOpen={false}
        onToggle={onToggle}
        onChange={jest.fn()}
        onRemove={jest.fn()}
        config={null}
        t={t}
      />,
    );

    expect(screen.queryByLabelText("templates.elementValueLabel")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "templates.expand" }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("hides value and style controls for line breaks", () => {
    render(
      <TemplateElementRow
        element={{ localId: "el-2", type: "LINE_BREAK", value: "", style: {} }}
        isOpen
        onToggle={jest.fn()}
        onChange={jest.fn()}
        onRemove={jest.fn()}
        config={null}
        t={t}
      />,
    );

    expect(screen.queryByLabelText("templates.elementValueLabel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("templates.justificationLabel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("templates.fontSizeLabel")).not.toBeInTheDocument();
  });
});
