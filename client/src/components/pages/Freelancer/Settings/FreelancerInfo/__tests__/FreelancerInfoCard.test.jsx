import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { usePermission } from "@/hooks/usePermission";

import { FreelancerInfoCard } from "../FreelancerInfoCard";

jest.mock("@/hooks/usePermission", () => ({
  usePermission: jest.fn(() => true),
  RequirePermission: ({ allOf, children: permittedContent }) => (jest.requireMock("@/hooks/usePermission").usePermission({ allOf }) ? permittedContent : null),
}));

const aliceBusinessInfo = {
  businessName: "Alice Studio",
  businessProfession: "Graphic Designer",
  businessTaxId: "ALIC800101AB1",
  businessAddress: "Main Street 123",
  timezone: "America/Mexico_City",
  businessEmail: "alice@example.com",
  businessPhone: "5551234567",
  businessLogoUrl: null,
};

function renderCard(cardProps = {}) {
  return render(<FreelancerInfoCard businessInfo={aliceBusinessInfo} onEdit={jest.fn()} {...cardProps} />);
}

describe("FreelancerInfoCard", () => {
  beforeEach(() => {
    usePermission.mockReturnValue(true);
  });

  it("renders the business information including the occupation", () => {
    renderCard();

    expect(screen.getByText("cardInfo.title")).toBeInTheDocument();
    expect(screen.getByText("Alice Studio")).toBeInTheDocument();
    expect(screen.getByText("cardInfo.profession")).toBeInTheDocument();
    expect(screen.getByText("Graphic Designer")).toBeInTheDocument();
    expect(screen.getByText("ALIC800101AB1")).toBeInTheDocument();
    expect(screen.getByText("America/Mexico_City")).toBeInTheDocument();
  });

  it("renders a placeholder for missing fields and the no logo label", () => {
    renderCard({ businessInfo: { businessName: "Bob" } });

    expect(screen.getAllByText("---").length).toBeGreaterThan(0);
    expect(screen.getByText("cardInfo.noLogo")).toBeInTheDocument();
  });

  it("calls onEdit when the edit button is pressed", async () => {
    const onEdit = jest.fn();
    renderCard({ onEdit });

    await userEvent.click(screen.getByText("cardInfo.edit"));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("hides the edit button for a role without settings_update", () => {
    usePermission.mockReturnValue(false);
    renderCard();

    expect(screen.queryByText("cardInfo.edit")).not.toBeInTheDocument();
  });
});
