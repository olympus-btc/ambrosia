import { render, screen } from "@testing-library/react";

import { ElementLogo } from "../ElementLogo";

jest.mock("@heroui/react", () => ({
  Image: ({ src: logoImageUrl }) => <span data-testid="logo-image" data-src={logoImageUrl} />,
}));

const businessConfig = { businessLogoUrl: "http://localhost:9154/uploads/2026-10/alice.png" };

describe("ElementLogo", () => {
  it("shows the business logo when the element has no image", () => {
    render(<ElementLogo templateText="" businessConfig={businessConfig} className="" />);
    expect(screen.getByTestId("logo-image")).toHaveAttribute("data-src", "/uploads/2026-10/alice.png");
  });

  it("shows the chosen image instead of the business logo", () => {
    render(<ElementLogo templateText="/uploads/2026-10/bob.png" businessConfig={businessConfig} className="" />);
    expect(screen.getByTestId("logo-image")).toHaveAttribute("data-src", "/uploads/2026-10/bob.png");
  });

  it("shows a placeholder when there is no logo", () => {
    render(<ElementLogo templateText="" businessConfig={{}} className="" />);
    expect(screen.queryByTestId("logo-image")).not.toBeInTheDocument();
    expect(screen.getByText("LOGO")).toBeInTheDocument();
  });

  it.each([
    ["NORMAL", "w-1/3"],
    ["LARGE", "w-1/2"],
    ["EXTRA_LARGE", "w-2/3"],
  ])("sizes the logo preview for %s", (fontSize, expectedWidthClass) => {
    render(<ElementLogo templateText="" businessConfig={businessConfig} fontSize={fontSize} className="" />);
    expect(screen.getByTestId("logo-preview")).toHaveClass(expectedWidthClass);
  });

  it.each([
    ["LEFT", "items-start"],
    ["CENTER", "items-center"],
    ["RIGHT", "items-end"],
  ])("aligns the logo preview for %s", (justification, expectedAlignmentClass) => {
    const { container: logoPreviewContainer } = render(
      <ElementLogo templateText="" businessConfig={businessConfig} justification={justification} className="" />,
    );
    expect(logoPreviewContainer.firstChild).toHaveClass(expectedAlignmentClass);
  });
});
