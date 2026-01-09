import { fireEvent, render, screen } from "@testing-library/react";

import { TemplateElementRow } from "../TemplateElementRow";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>
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

const t = (key) => key;

describe("TemplateElementRow", () => {
  it("updates element fields and toggles bold", () => {
    const onChange = jest.fn();
    const onMove = jest.fn();
    const onRemove = jest.fn();

    const element = {
      localId: "el-1",
      type: "TEXT",
      value: "",
      style: {
        bold: false,
        justification: "LEFT",
        fontSize: "NORMAL",
      },
    };

    render(
      <TemplateElementRow
        element={element}
        onChange={onChange}
        onMove={onMove}
        onRemove={onRemove}
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

    fireEvent.click(screen.getByText("templates.boldOff"));
    expect(onChange).toHaveBeenCalledWith({
      ...element,
      style: { ...element.style, bold: true },
    });

    fireEvent.click(screen.getByText("templates.moveUp"));
    expect(onMove).toHaveBeenCalledWith("el-1", -1);

    fireEvent.click(screen.getByText("templates.moveDown"));
    expect(onMove).toHaveBeenCalledWith("el-1", 1);

    fireEvent.click(screen.getByText("templates.removeElement"));
    expect(onRemove).toHaveBeenCalledWith("el-1");
  });

  it("hides value and style controls for line breaks", () => {
    render(
      <TemplateElementRow
        element={{ localId: "el-2", type: "LINE_BREAK" }}
        onChange={jest.fn()}
        onMove={jest.fn()}
        onRemove={jest.fn()}
        t={t}
      />,
    );

    expect(
      screen.queryByLabelText("templates.elementValueLabel"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("templates.justificationLabel"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("templates.fontSizeLabel"),
    ).not.toBeInTheDocument();
  });
});
