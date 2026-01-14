import { fireEvent, render, screen } from "@testing-library/react";

import { TemplateList } from "../TicketTemplate/TemplateList";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

const t = (key) => key;

describe("TemplateList", () => {
  it("shows loading, error, and empty states", () => {
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

    expect(screen.getByText("templates.loading")).toBeInTheDocument();

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
    expect(screen.getByText("templates.empty")).toBeInTheDocument();
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

    fireEvent.click(screen.getByText("templates.newTemplate"));
    expect(onNew).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Alt"));
    expect(onSelect).toHaveBeenCalledWith({ id: "t-2", name: "Alt" });
  });
});
