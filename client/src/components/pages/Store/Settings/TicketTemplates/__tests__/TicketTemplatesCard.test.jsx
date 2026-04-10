import { render, screen } from "@testing-library/react";

import { TicketTemplatesCard } from "../TicketTemplatesCard";

jest.mock("@heroui/react", () => ({
  Card: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardBody: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }) => <div {...props}>{children}</div>,
}));

jest.mock("../List", () => ({
  TemplateList: (props) => (
    <div data-testid="template-list" data-loading={String(props.loading)} />
  ),
}));

const t = (key) => key;

describe("TicketTemplatesCard", () => {
  it("renders title and template list", () => {
    render(
      <TicketTemplatesCard
        templates={[]}
        loading={false}
        error={null}
        selectedId=""
        onSelect={jest.fn()}
        onNew={jest.fn()}
        t={t}
      />,
    );
    expect(screen.getByText("templates.title")).toBeInTheDocument();
    expect(screen.getByTestId("template-list")).toBeInTheDocument();
  });

  it("passes loading to TemplateList", () => {
    render(
      <TicketTemplatesCard
        templates={[]}
        loading
        error={null}
        selectedId=""
        onSelect={jest.fn()}
        onNew={jest.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId("template-list")).toHaveAttribute("data-loading", "true");
  });
});
