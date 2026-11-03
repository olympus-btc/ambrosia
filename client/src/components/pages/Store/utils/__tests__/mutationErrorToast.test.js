import {
  isAdminPrivilegesRequired,
  isConflict,
  isCurrentUserPinIncorrect,
  isLastAdminConflict,
  isLightningBackendUnavailable,
  resolveMutationErrorToast,
  translateToast,
} from "../mutationErrorToast";

describe("isLightningBackendUnavailable", () => {
  it("matches a 409 whose message asks for a Lightning address", () => {
    expect(isLightningBackendUnavailable({
      status: 409,
      responseMessage: "A Lightning address is required when no Lightning backend is active",
    })).toBe(true);
  });

  it("does not match a 409 with an unrelated message", () => {
    expect(isLightningBackendUnavailable({ status: 409, responseMessage: "Secrets are locked" })).toBe(false);
  });

  it("does not match the right message on a different status", () => {
    expect(isLightningBackendUnavailable({
      status: 400,
      responseMessage: "A Lightning address is required when no Lightning backend is active",
    })).toBe(false);
  });
});

describe("isAdminPrivilegesRequired", () => {
  it("matches a 403 with the exact admin-required message", () => {
    expect(isAdminPrivilegesRequired({ status: 403, responseMessage: "Admin privileges required" })).toBe(true);
  });

  it("does not match a 403 with a different message", () => {
    expect(isAdminPrivilegesRequired({ status: 403, responseMessage: "Forbidden" })).toBe(false);
  });

  it("does not match the right message on a different status", () => {
    expect(isAdminPrivilegesRequired({ status: 401, responseMessage: "Admin privileges required" })).toBe(false);
  });

  it("does not match when there is no error", () => {
    expect(isAdminPrivilegesRequired(undefined)).toBe(false);
  });
});

describe("isCurrentUserPinIncorrect", () => {
  it("matches a 403 with the exact current-PIN-incorrect message", () => {
    expect(isCurrentUserPinIncorrect({ status: 403, responseMessage: "Current PIN is incorrect" })).toBe(true);
  });

  it("does not match a 403 with a different message", () => {
    expect(isCurrentUserPinIncorrect({ status: 403, responseMessage: "Admin privileges required" })).toBe(false);
  });

  it("does not match the right message on a different status", () => {
    expect(isCurrentUserPinIncorrect({ status: 401, responseMessage: "Current PIN is incorrect" })).toBe(false);
  });
});

describe("isLastAdminConflict", () => {
  it("matches a 409 whose message includes last admin", () => {
    expect(isLastAdminConflict({ status: 409, responseMessage: "Cannot remove the last admin user" })).toBe(true);
  });

  it("does not match a 409 with an unrelated message", () => {
    expect(isLastAdminConflict({ status: 409, responseMessage: "Role already exists" })).toBe(false);
  });

  it("does not match the right message on a different status", () => {
    expect(isLastAdminConflict({ status: 500, responseMessage: "Cannot remove the last admin user" })).toBe(false);
  });
});

describe("isConflict", () => {
  it("matches any 409 regardless of message", () => {
    expect(isConflict({ status: 409, responseMessage: "Role already exists" })).toBe(true);
  });

  it("does not match a non-409 status", () => {
    expect(isConflict({ status: 500, responseMessage: "Server error" })).toBe(false);
  });

  it("does not match when there is no error", () => {
    expect(isConflict(undefined)).toBe(false);
  });
});

describe("resolveMutationErrorToast", () => {
  const adminRequiredToast = { title: "Admin required", description: "Ask an admin", color: "warning" };
  const conflictToast = { title: "Conflict", description: "Already exists", color: "danger" };
  const fallbackToast = { title: "Error", description: "Something went wrong", color: "danger" };

  it("returns the toast of the first matching rule", () => {
    const requestError = { status: 403, responseMessage: "Admin privileges required" };

    const resolvedToast = resolveMutationErrorToast(requestError, [
      { when: isAdminPrivilegesRequired, toast: adminRequiredToast },
      { when: isConflict, toast: conflictToast },
    ], fallbackToast);

    expect(resolvedToast).toBe(adminRequiredToast);
  });

  it("respects rule order when more than one rule would match", () => {
    const requestError = { status: 409, responseMessage: "Cannot remove the last admin user" };

    const resolvedToast = resolveMutationErrorToast(requestError, [
      { when: isConflict, toast: conflictToast },
      { when: isLastAdminConflict, toast: adminRequiredToast },
    ], fallbackToast);

    expect(resolvedToast).toBe(conflictToast);
  });

  it("returns the fallback toast when no rule matches", () => {
    const requestError = { status: 500, responseMessage: "Unexpected error" };

    const resolvedToast = resolveMutationErrorToast(requestError, [
      { when: isAdminPrivilegesRequired, toast: adminRequiredToast },
    ], fallbackToast);

    expect(resolvedToast).toBe(fallbackToast);
  });

  it("returns the fallback toast when the rules list is empty", () => {
    expect(resolveMutationErrorToast({ status: 500 }, [], fallbackToast)).toBe(fallbackToast);
  });
});

describe("translateToast", () => {
  it("builds a toast by translating the title and description keys", () => {
    const mockTranslations = (translationKey) => `translated:${translationKey}`;

    expect(translateToast(mockTranslations, "titleKey", "descriptionKey", "warning")).toEqual({
      title: "translated:titleKey",
      description: "translated:descriptionKey",
      color: "warning",
    });
  });

  it("passes each key to translate independently", () => {
    const mockTranslations = jest.fn((translationKey) => translationKey);

    translateToast(mockTranslations, "toasts.errorTitle", "toasts.errorDescription", "danger");

    expect(mockTranslations).toHaveBeenCalledWith("toasts.errorTitle");
    expect(mockTranslations).toHaveBeenCalledWith("toasts.errorDescription");
  });
});
