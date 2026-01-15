import { render, screen } from "@testing-library/react";

import { TemplatePreview } from "../TicketTemplate/TemplatePreview";

const t = (key) => key;

describe("TemplatePreview", () => {
  it("shows empty message when no elements exist", () => {
    render(<TemplatePreview previewElements={[]} t={t} />);
    expect(screen.getByText("templates.previewEmpty")).toBeInTheDocument();
  });

  it("renders preview elements when provided", () => {
    render(
      <TemplatePreview
        previewElements={[<div key="one">Preview Line</div>]}
        t={t}
      />,
    );
    expect(screen.getByText("Preview Line")).toBeInTheDocument();
  });
});
