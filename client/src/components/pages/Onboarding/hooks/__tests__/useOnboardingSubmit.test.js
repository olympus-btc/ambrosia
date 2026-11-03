import { addToast } from "@heroui/react";
import { renderHook, act } from "@testing-library/react";

import { authenticateUser, logoutSession } from "@/lib/auth/authSession";
import { activateSecretsEncryption } from "@/services/secretsService";
import { loginWallet, logoutWallet } from "@/services/walletService";
import { submitInitialSetup } from "@services/initialSetupService";

import { useOnboardingSubmit } from "../useOnboardingSubmit";

const mockUpload = jest.fn();

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (translationKey) => translationKey,
}));

jest.mock("@services/initialSetupService", () => ({
  submitInitialSetup: jest.fn(),
}));

jest.mock("@/lib/auth/authSession", () => ({
  authenticateUser: jest.fn(),
  logoutSession: jest.fn(),
}));

jest.mock("@/services/secretsService", () => ({
  activateSecretsEncryption: jest.fn(),
}));

jest.mock("@/services/walletService", () => ({
  loginWallet: jest.fn(),
  logoutWallet: jest.fn(),
}));

jest.mock("@components/hooks/useUpload", () => ({
  useUpload: () => ({ upload: mockUpload }),
}));

function makeSetupResponse(setupResponseBody = {}) {
  return { json: () => Promise.resolve(setupResponseBody) };
}

const defaultOnboardingData = {
  businessType: "store",
  walletBackend: "phoenixd",
  nwcUri: "",
  phoenixdRemote: false,
  phoenixdUrl: "",
  phoenixdPassword: "",
  activateSecretsEncryption: false,
  userName: "testuser",
  userPassword: "Abcd123$",
  userPasswordConfirmation: "Abcd123$",
  userPin: "0000",
  businessName: "My Business",
  businessAddress: "",
  businessPhone: "",
  businessEmail: "",
  businessRFC: "",
  businessCurrency: "USD",
  timezone: "America/Mexico_City",
  businessLogo: null,
};

function renderOnboardingSubmit(onboardingDataOverrides = {}, needsBusinessType = false) {
  return renderHook(() => (
    useOnboardingSubmit({
      onboardingData: { ...defaultOnboardingData, ...onboardingDataOverrides },
      needsBusinessType,
    })
  ));
}

beforeEach(() => {
  jest.clearAllMocks();
  submitInitialSetup.mockResolvedValue(makeSetupResponse());
  authenticateUser.mockResolvedValue({ user: { id: "user-1" }, permissions: [] });
  activateSecretsEncryption.mockResolvedValue({ message: "Secrets encryption activated" });
  loginWallet.mockResolvedValue({ token: "wallet-token" });
  logoutWallet.mockResolvedValue(null);
  logoutSession.mockResolvedValue(null);
  mockUpload.mockResolvedValue([{ url: "https://uploads.test/logo.png" }]);
});

describe("useOnboardingSubmit", () => {
  describe("needsBusinessType only", () => {
    it("submits only the business type and skips the rest of the pipeline", async () => {
      const { result: submitHook } = renderOnboardingSubmit({}, true);

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(submitInitialSetup).toHaveBeenCalledWith({ businessType: "store" });
      expect(submitInitialSetup).toHaveBeenCalledTimes(1);
      expect(loginWallet).not.toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "submitOnboardingToast.title", color: "success" }),
      );
    });
  });

  describe("payload building", () => {
    it("excludes internal-only fields and sends the browser-detected timezone", async () => {
      const { result: submitHook } = renderOnboardingSubmit();

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(submitInitialSetup).toHaveBeenCalledWith(
        expect.objectContaining({
          businessLogo: undefined,
          userPasswordConfirmation: undefined,
          walletBackend: undefined,
          activateSecretsEncryption: undefined,
          timezone: "America/Mexico_City",
        }),
      );
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it("does not send wallet-backend-specific fields for the default local phoenixd backend", async () => {
      const { result: submitHook } = renderOnboardingSubmit();

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(submitInitialSetup).toHaveBeenCalledWith(
        expect.objectContaining({
          nwcUri: undefined,
          phoenixdRemote: undefined,
          phoenixdUrl: undefined,
          phoenixdPassword: undefined,
        }),
      );
    });

    it("uploads the business logo and sends its URL", async () => {
      const businessLogo = new File(["fake"], "logo.png", { type: "image/png" });
      const { result: submitHook } = renderOnboardingSubmit({ businessLogo });

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(mockUpload).toHaveBeenCalledWith([businessLogo]);
      expect(submitInitialSetup).toHaveBeenCalledWith(
        expect.objectContaining({ businessLogoUrl: "https://uploads.test/logo.png" }),
      );
    });

    it("sends the NWC URI only when the wallet backend is nwc", async () => {
      const { result: submitHook } = renderOnboardingSubmit({
        walletBackend: "nwc",
        nwcUri: "nostr+walletconnect://abc",
      });

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(submitInitialSetup).toHaveBeenCalledWith(
        expect.objectContaining({ nwcUri: "nostr+walletconnect://abc" }),
      );
    });

    it("sends the phoenixd remote fields only when a remote node was attempted", async () => {
      const { result: submitHook } = renderOnboardingSubmit({
        phoenixdRemote: true,
        phoenixdUrl: "http://100.1.1.1:9740",
        phoenixdPassword: "remote-password",
      });

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(submitInitialSetup).toHaveBeenCalledWith(
        expect.objectContaining({
          phoenixdRemote: true,
          phoenixdUrl: "http://100.1.1.1:9740",
          phoenixdPassword: "remote-password",
        }),
      );
    });
  });

  describe("response body parsing", () => {
    it("still completes successfully when the setup response body is not valid JSON", async () => {
      submitInitialSetup.mockResolvedValueOnce({ json: () => Promise.reject(new Error("invalid json")) });
      const { result: submitHook } = renderOnboardingSubmit();

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "submitOnboardingToast.title", color: "success" }),
      );
    });
  });

  describe("NWC onboarding result toast", () => {
    it("shows the NWC activated toast, deferring the reload to it instead of the generic success toast", async () => {
      submitInitialSetup.mockResolvedValueOnce(makeSetupResponse({ nwcSaved: true }));
      const { result: submitHook } = renderOnboardingSubmit({
        walletBackend: "nwc",
        nwcUri: "nostr+walletconnect://abc",
      });

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(addToast).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ title: "submitOnboardingToast.title", onClose: undefined }),
      );
      expect(addToast).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          title: "submitOnboardingToast.nwcSavedTitle",
          color: "primary",
          onClose: expect.any(Function),
        }),
      );
    });

    it("shows an error toast when the NWC backend could not be connected", async () => {
      submitInitialSetup.mockResolvedValueOnce(makeSetupResponse({ nwcSaved: false }));
      const { result: submitHook } = renderOnboardingSubmit({
        walletBackend: "nwc",
        nwcUri: "nostr+walletconnect://abc",
      });

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "submitOnboardingToast.nwcErrorTitle", color: "danger" }),
      );
    });
  });

  describe("phoenixd remote onboarding result toast", () => {
    it("shows the phoenixd remote activated toast when the backend connects successfully", async () => {
      submitInitialSetup.mockResolvedValueOnce(makeSetupResponse({ phoenixdRemoteSaved: true }));
      const { result: submitHook } = renderOnboardingSubmit({
        phoenixdRemote: true,
        phoenixdUrl: "http://100.1.1.1:9740",
        phoenixdPassword: "remote-password",
      });

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "submitOnboardingToast.phoenixdRemoteSavedTitle", color: "primary" }),
      );
    });

    it("shows an error toast when the remote phoenixd node could not be connected", async () => {
      submitInitialSetup.mockResolvedValueOnce(makeSetupResponse({ phoenixdRemoteSaved: false }));
      const { result: submitHook } = renderOnboardingSubmit({
        phoenixdRemote: true,
        phoenixdUrl: "http://100.1.1.1:9740",
        phoenixdPassword: "remote-password",
      });

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "submitOnboardingToast.phoenixdRemoteErrorTitle", color: "danger" }),
      );
    });
  });

  describe("secrets encryption activation", () => {
    it("authenticates a regular session, logs into the wallet, activates encryption, then logs out of both sessions in order", async () => {
      const callOrder = [];
      authenticateUser.mockImplementationOnce(async () => {
        callOrder.push("authenticateUser");
        return { user: { id: "user-1" }, permissions: [] };
      });
      loginWallet.mockImplementationOnce(async () => {
        callOrder.push("loginWallet");
        return { token: "wallet-token" };
      });
      activateSecretsEncryption.mockImplementationOnce(async () => {
        callOrder.push("activateSecretsEncryption");
        return { message: "Secrets encryption activated" };
      });
      logoutWallet.mockImplementationOnce(async () => {
        callOrder.push("logoutWallet");
        return null;
      });
      logoutSession.mockImplementationOnce(async () => {
        callOrder.push("logoutSession");
        return null;
      });

      const { result: submitHook } = renderOnboardingSubmit({
        activateSecretsEncryption: true,
      });

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(authenticateUser).toHaveBeenCalledWith({ name: "testuser", pin: "0000", skipRefresh: true });
      expect(loginWallet).toHaveBeenCalledWith("Abcd123$");
      expect(activateSecretsEncryption).toHaveBeenCalledWith("Abcd123$");
      expect(logoutSession).toHaveBeenCalledWith({ skipRefresh: true });
      expect(callOrder).toEqual([
        "authenticateUser",
        "loginWallet",
        "activateSecretsEncryption",
        "logoutWallet",
        "logoutSession",
      ]);
    });

    it("does not attempt activation when the admin did not opt in", async () => {
      const { result: submitHook } = renderOnboardingSubmit();

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(authenticateUser).not.toHaveBeenCalled();
      expect(loginWallet).not.toHaveBeenCalled();
      expect(activateSecretsEncryption).not.toHaveBeenCalled();
      expect(logoutWallet).not.toHaveBeenCalled();
      expect(logoutSession).not.toHaveBeenCalled();
    });

    it("shows an error toast and still logs out of both sessions when authentication fails", async () => {
      authenticateUser.mockRejectedValueOnce(new Error("Invalid credentials"));
      const { result: submitHook } = renderOnboardingSubmit({
        activateSecretsEncryption: true,
      });

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(loginWallet).not.toHaveBeenCalled();
      expect(activateSecretsEncryption).not.toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "Invalid credentials" }),
      );
      expect(logoutWallet).toHaveBeenCalledTimes(1);
      expect(logoutSession).toHaveBeenCalledWith({ skipRefresh: true });
    });

    it("shows an error toast and still logs out of both sessions when activation fails", async () => {
      activateSecretsEncryption.mockRejectedValueOnce(new Error("Could not reach the server"));
      const { result: submitHook } = renderOnboardingSubmit({
        activateSecretsEncryption: true,
      });

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ color: "danger", description: "Could not reach the server" }),
      );
      expect(logoutWallet).toHaveBeenCalledTimes(1);
      expect(logoutSession).toHaveBeenCalledWith({ skipRefresh: true });
    });

    it("falls back to the translated message when the activation error has none", async () => {
      activateSecretsEncryption.mockRejectedValueOnce(new Error());
      const { result: submitHook } = renderOnboardingSubmit({
        activateSecretsEncryption: true,
      });

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "danger",
          description: "submitOnboardingToast.secretsEncryptionErrorDescription",
        }),
      );
    });
  });

  describe("setup submit feedback", () => {
    it("shows a localized error toast when setup submission fails", async () => {
      submitInitialSetup.mockRejectedValueOnce(new Error("Server unavailable"));
      const { result: submitHook } = renderOnboardingSubmit();

      await act(async () => {
        await submitHook.current.handleComplete();
      });

      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "submitOnboardingToast.errorTitle",
          description: "Server unavailable",
          color: "danger",
        }),
      );
    });

    it("prevents duplicate submissions while one is already in flight", async () => {
      let resolveSetupSubmission;
      submitInitialSetup.mockImplementationOnce(() => new Promise((resolveSetup) => {
        resolveSetupSubmission = resolveSetup;
      }));
      const { result: submitHook } = renderOnboardingSubmit();

      let firstSubmission;
      await act(async () => {
        firstSubmission = submitHook.current.handleComplete();
        await submitHook.current.handleComplete();
      });

      expect(submitInitialSetup).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveSetupSubmission(makeSetupResponse());
        await firstSubmission;
      });
    });

    it("exposes isSubmittingSetup as true only while a submission is in flight", async () => {
      let resolveSetupSubmission;
      submitInitialSetup.mockImplementationOnce(() => new Promise((resolveSetup) => {
        resolveSetupSubmission = resolveSetup;
      }));
      const { result: submitHook } = renderOnboardingSubmit();

      let submission;
      act(() => {
        submission = submitHook.current.handleComplete();
      });
      expect(submitHook.current.isSubmittingSetup).toBe(true);

      await act(async () => {
        resolveSetupSubmission(makeSetupResponse());
        await submission;
      });
      expect(submitHook.current.isSubmittingSetup).toBe(false);
    });
  });
});
