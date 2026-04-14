import { fireEvent, render, screen } from "@testing-library/react";

import * as useTemplatesHook from "@components/pages/Store/hooks/useTemplates";

import { TicketTemplates } from "../TicketTemplates";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@components/pages/Store/hooks/useTemplates");

let capturedCardProps = null;
jest.mock("../TicketTemplatesCard", () => ({
  TicketTemplatesCard: (props) => {
    capturedCardProps = props;
    return (
      <div>
        <button type="button" onClick={() => props.onSelect({ id: "t-1", name: "Tpl" })}>
          select
        </button>
        <button type="button" onClick={props.onNew}>
          new
        </button>
      </div>
    );
  },
}));

let capturedModalProps = null;
jest.mock("../Modal", () => ({
  TicketTemplatesModal: (props) => {
    capturedModalProps = props;
    return props.isOpen
      ? <button type="button" onClick={props.onClose}>close-modal</button>
      : null;
  },
}));

const defaultTemplates = {
  templates: [{ id: "t-1", name: "Tpl" }],
  loading: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  capturedCardProps = null;
  capturedModalProps = null;
  jest.clearAllMocks();
  useTemplatesHook.useTemplates.mockReturnValue(defaultTemplates);
});

describe("TicketTemplates", () => {
  it("passes template data to card", () => {
    render(<TicketTemplates />);
    expect(capturedCardProps.templates).toEqual(defaultTemplates.templates);
    expect(capturedCardProps.loading).toBe(false);
    expect(capturedCardProps.error).toBeNull();
  });

  it("modal starts closed", () => {
    render(<TicketTemplates />);
    expect(capturedModalProps.isOpen).toBe(false);
  });

  it("opens modal with template on onSelect", () => {
    render(<TicketTemplates />);
    fireEvent.click(screen.getByText("select"));
    expect(capturedModalProps.isOpen).toBe(true);
    expect(capturedModalProps.initialTemplate).toEqual({ id: "t-1", name: "Tpl" });
  });

  it("opens modal without template on onNew", () => {
    render(<TicketTemplates />);
    fireEvent.click(screen.getByText("new"));
    expect(capturedModalProps.isOpen).toBe(true);
    expect(capturedModalProps.initialTemplate).toBeNull();
  });

  it("closes modal and refetches on onClose", () => {
    const refetch = jest.fn();
    useTemplatesHook.useTemplates.mockReturnValue({ ...defaultTemplates, refetch });
    render(<TicketTemplates />);
    fireEvent.click(screen.getByText("new"));
    fireEvent.click(screen.getByText("close-modal"));
    expect(capturedModalProps.isOpen).toBe(false);
    expect(refetch).toHaveBeenCalled();
  });
});
