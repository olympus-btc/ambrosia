import { fireEvent, render, screen } from "@testing-library/react";

import { TemplateElementsEditor } from "../TemplateElementsEditor";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("../TemplateElementRow", () => ({
  TemplateElementRow: ({ element }) => (
    <div data-testid={`row-${element.localId}`} />
  ),
}));

const t = (key) => key;

describe("TemplateElementsEditor", () => {
  it("renders rows and triggers add", () => {
    const onAdd = jest.fn();
    render(
      <TemplateElementsEditor
        elements={[{ localId: "one" }, { localId: "two" }]}
        onChange={jest.fn()}
        onAdd={onAdd}
        onMove={jest.fn()}
        onRemove={jest.fn()}
        t={t}
      />,
    );

    expect(screen.getByTestId("row-one")).toBeInTheDocument();
    expect(screen.getByTestId("row-two")).toBeInTheDocument();

    fireEvent.click(screen.getByText("templates.addElement"));
    expect(onAdd).toHaveBeenCalled();
  });
});
