import { render, screen } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { BusinessHeader } from "../BusinessHeader";

const renderHeader = (props = {}) => render(
  <I18nProvider>
    <BusinessHeader businessName="Test Store" businessLogoUrl={null} {...props} />
  </I18nProvider>,
);

describe("BusinessHeader", () => {
  it("renders the business name", () => {
    renderHeader({ businessName: "My Store" });
    expect(screen.getByText("My Store")).toBeInTheDocument();
  });

  it("renders the title", () => {
    renderHeader();
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("renders logo image when url is provided", () => {
    renderHeader({ businessLogoUrl: "https://example.com/logo.png" });
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/logo.png");
  });

  it("renders without crashing when businessLogoUrl is null", () => {
    renderHeader({ businessLogoUrl: null });
    expect(screen.getByText("Test Store")).toBeInTheDocument();
  });

  it("renders without crashing when businessName is undefined", () => {
    renderHeader({ businessName: undefined });
    expect(screen.getByText("title")).toBeInTheDocument();
  });
});
