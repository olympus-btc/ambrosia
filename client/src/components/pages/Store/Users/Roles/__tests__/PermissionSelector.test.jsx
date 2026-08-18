import { render, screen } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { PermissionSelector } from "../PermissionSelector";

const catalog = [
  { key: "orders_read", group: "sales" },
  { key: "orders_refund", group: "sales" },
];

const renderSelector = (props = {}) => render(
  <I18nProvider>
    <PermissionSelector
      catalog={catalog}
      selected={[]}
      togglePermission={jest.fn()}
      businessType="store"
      {...props}
    />
  </I18nProvider>,
);

describe("PermissionSelector", () => {
  it("keeps the admin notice space reserved but invisible when isAdmin is false", () => {
    renderSelector({ isAdmin: false });
    expect(screen.getByText("roles.permissions.adminNotice")).toHaveClass("invisible");
  });

  it("leaves checkboxes enabled and unchecked when isAdmin is false and nothing is selected", () => {
    const { container } = renderSelector({ isAdmin: false });
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    checkboxes.forEach((checkbox) => {
      expect(checkbox).not.toBeChecked();
      expect(checkbox).not.toBeDisabled();
    });
  });

  it("shows the admin notice and forces every checkbox checked and disabled when isAdmin is true", () => {
    const { container } = renderSelector({ isAdmin: true });
    expect(screen.getByText("roles.permissions.adminNotice")).not.toHaveClass("invisible");
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
      expect(checkbox).toBeDisabled();
    });
  });
});
