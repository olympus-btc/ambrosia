import { useRouter, usePathname } from "next/navigation";

import { act, render, screen } from "@testing-library/react";

import { getCurrentSession } from "@/lib/auth/authSession";

import { AuthProvider } from "../AuthProvider";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock("@/lib/auth/authSession", () => ({
  getCurrentSession: jest.fn(),
  authenticateUser: jest.fn(),
  logoutSession: jest.fn(),
}));

const mockPush = jest.fn();

async function renderAuthProvider() {
  const authProviderScreen = render(
    <AuthProvider>
      <div>protected child</div>
    </AuthProvider>,
  );
  await act(async () => {});
  return authProviderScreen;
}

beforeEach(() => {
  jest.clearAllMocks();
  useRouter.mockReturnValue({ push: mockPush });
  getCurrentSession.mockRejectedValue(Object.assign(new Error("No session"), { status: 401 }));
});

describe("AuthProvider", () => {
  it("renders its children", async () => {
    usePathname.mockReturnValue("/store");

    await renderAuthProvider();

    expect(screen.getByText("protected child")).toBeInTheDocument();
  });

  describe("onExpired redirect", () => {
    it("does not redirect when auth:expired fires while already on /auth", async () => {
      usePathname.mockReturnValue("/auth");
      await renderAuthProvider();

      await act(async () => {
        window.dispatchEvent(new Event("auth:expired"));
      });

      expect(mockPush).not.toHaveBeenCalledWith("/auth");
    });

    it("does not redirect when auth:expired fires while on /onboarding", async () => {
      usePathname.mockReturnValue("/onboarding");
      await renderAuthProvider();

      await act(async () => {
        window.dispatchEvent(new Event("auth:expired"));
      });

      expect(mockPush).not.toHaveBeenCalledWith("/auth");
    });

    it("redirects to /auth when auth:expired fires on any other route", async () => {
      usePathname.mockReturnValue("/store");
      await renderAuthProvider();

      await act(async () => {
        window.dispatchEvent(new Event("auth:expired"));
      });

      expect(mockPush).toHaveBeenCalledWith("/auth");
    });
  });
});
