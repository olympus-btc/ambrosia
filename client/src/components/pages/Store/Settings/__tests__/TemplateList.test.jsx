import { fireEvent, render, screen } from "@testing-library/react";

import { TemplateList } from "../TicketTemplate/TemplateList";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Select: ({ children, label, placeholder, onChange, isLoading, ...props }) => (
    <div>
      <label>{label}</label>
      {isLoading && <span>loading...</span>}
      <select onChange={onChange} data-testid="template-select" {...props}>
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  ),
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
}));

const t = (key) => key;

describe("TemplateList", () => {
  it("shows loading state and error message", () => {
    const { rerender } = render(
      <TemplateList
        templates={[]}
        selectedId=""
        loading
        error={null}
        onSelect={jest.fn()}
        onNew={jest.fn()}
        t={t}
      />,
    );

    expect(screen.getByText("loading...")).toBeInTheDocument();

    rerender(
      <TemplateList
        templates={[]}
        selectedId=""
        loading={false}
        error
        onSelect={jest.fn()}
        onNew={jest.fn()}
        t={t}
      />,
    );

    expect(screen.getByText("templates.error")).toBeInTheDocument();
  });

  it("selects a template and creates a new one", () => {
    const onSelect = jest.fn();
    const onNew = jest.fn();

    render(
      <TemplateList
        templates={[
          { id: "t-1", name: "Main" },
          { id: "t-2", name: "Alt" },
        ]}
        selectedId="t-1"
        loading={false}
        error={null}
        onSelect={onSelect}
        onNew={onNew}
        t={t}
      />,
    );

    fireEvent.click(screen.getByText("templates.addTemplate"));
    expect(onNew).toHaveBeenCalled();

    const select = screen.getByTestId("template-select");
    fireEvent.change(select, { target: { value: "t-2" } });
    expect(onSelect).toHaveBeenCalledWith({ id: "t-2", name: "Alt" });
  });

  it("shows select label and placeholder", () => {
    render(
      <TemplateList
        templates={[]}
        selectedId=""
        loading={false}
        error={null}
        onSelect={jest.fn()}
        onNew={jest.fn()}
        t={t}
      />,
    );

    expect(screen.getByText("templates.listTitle")).toBeInTheDocument();
    expect(screen.getByText("templates.selectPlaceholder")).toBeInTheDocument();
  });
});
