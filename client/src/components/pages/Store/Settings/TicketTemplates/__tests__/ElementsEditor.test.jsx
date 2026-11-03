import { fireEvent, render, screen } from "@testing-library/react";

import { TemplateElementsEditor } from "../ElementsEditor";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, ...props }) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("../ElementRow", () => ({
  TemplateElementRow: ({ templateElement }) => (
    <div data-testid={`row-${templateElement.localId}`} />
  ),
}));

const settingsTranslations = (key) => key;

describe("TemplateElementsEditor", () => {
  it("renders rows and triggers add", () => {
    const onAdd = jest.fn();
    render(
      <TemplateElementsEditor
        templateElements={[{ localId: "one" }, { localId: "two" }]}
        onChange={jest.fn()}
        onAdd={onAdd}
        onMove={jest.fn()}
        onRemove={jest.fn()}
        settingsTranslations={settingsTranslations}
      />,
    );

    expect(screen.getByTestId("row-one")).toBeInTheDocument();
    expect(screen.getByTestId("row-two")).toBeInTheDocument();

    fireEvent.click(screen.getByText("templates.addElement"));
    expect(onAdd).toHaveBeenCalled();
  });
});
