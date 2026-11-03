import { render, screen } from "@testing-library/react";

import { ClientsCard } from "../ClientsCard";

jest.mock("next-intl", () => ({
  useTranslations: () => (translationKey, translationValues) => {
    if (translationKey === "morePaymentMethods") return `+${translationValues.count} more`;
    return translationKey;
  },
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ children }) => <button type="button">{children}</button>,
}));

jest.mock("@/components/shared/EditButton", () => ({
  EditButton: ({ children }) => <button type="button">{children}</button>,
}));

jest.mock("@/hooks/usePermission", () => ({
  RequirePermission: ({ children }) => <>{children}</>,
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Chip: ({ children, className }) => <span className={className}>{children}</span>,
}));

const currencies = [{ id: "currency-1", acronym: "USD" }];

function renderClientsCard(clientOverrides = {}) {
  const client = {
    id: "client-1",
    name: "Acme",
    currencyId: "currency-1",
    hourlyRateCents: 7500,
    billingCycle: "monthly",
    paymentMethods: ["bank", "lightning"],
    ...clientOverrides,
  };

  render(
    <ClientsCard
      client={client}
      currencies={currencies}
      canManageClients={false}
      onDeleteClient={jest.fn()}
      onEditClient={jest.fn()}
    />,
  );
}

describe("ClientsCard", () => {
  it("shows the client payment methods as preview pills", () => {
    renderClientsCard();

    expect(screen.getByText("paymentMethods.bank")).toBeInTheDocument();
    expect(screen.getByText("paymentMethods.lightning")).toBeInTheDocument();
  });

  it("shows a count when a client has more than three payment methods", () => {
    renderClientsCard({ paymentMethods: ["bank", "lightning", "cash", "card"] });

    expect(screen.getByText("+1 more")).toBeInTheDocument();
  });

  it("keeps compatibility with clients that only have a default payment method", () => {
    renderClientsCard({ paymentMethods: undefined, paymentMethod: "bank" });

    expect(screen.getByText("paymentMethods.bank")).toBeInTheDocument();
  });
});
