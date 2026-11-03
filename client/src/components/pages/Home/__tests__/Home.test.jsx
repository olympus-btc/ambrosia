import { useRouter } from "next/navigation";

import { render, waitFor } from "@testing-library/react";

import { useAuth } from "@/hooks/auth/useAuth";
import { getHomeRoute } from "@/lib/getHomeRoute";
import { useConfigurations } from "@/providers/configurations/configurationsProvider";

import { Home } from "../Home";

jest.mock("@/hooks/auth/useAuth", () => ({ useAuth: jest.fn() }));
jest.mock("@/providers/configurations/configurationsProvider", () => ({ useConfigurations: jest.fn() }));
jest.mock("@/lib/getHomeRoute", () => ({ getHomeRoute: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));

const mockReplace = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useRouter.mockReturnValue({ replace: mockReplace });
});

describe("Home", () => {
  it("does not route anywhere while the auth state is still resolving", () => {
    useAuth.mockReturnValue({ user: null, isAuth: false, isLoading: true });
    useConfigurations.mockReturnValue({ businessType: null, isLoading: true });

    render(<Home />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("waits for config to finish loading before routing, even when authenticated", () => {
    useAuth.mockReturnValue({ user: { id: "user-1" }, isAuth: true, isLoading: false });
    useConfigurations.mockReturnValue({ businessType: null, isLoading: true });

    render(<Home />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("routes to the resolved home route once auth and config are both ready", async () => {
    const user = { id: "user-1" };
    useAuth.mockReturnValue({ user, isAuth: true, isLoading: false });
    useConfigurations.mockReturnValue({ businessType: "store", isLoading: false });
    getHomeRoute.mockReturnValue("/store");

    render(<Home />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/store"));
    expect(getHomeRoute).toHaveBeenCalledWith(user, "store");
  });
});
