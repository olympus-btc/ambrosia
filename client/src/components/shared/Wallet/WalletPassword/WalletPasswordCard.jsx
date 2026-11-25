"use client";

import { useRef, useState } from "react";

import { addToast, Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { changeWalletPassword } from "@/services/walletService";

const EMPTY_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const PASSWORD_VISIBILITY_DEFAULTS = {
  currentPassword: false,
  newPassword: false,
  confirmPassword: false,
};

function PasswordVisibilityButton({ isVisible, onToggle, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    >
      {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  );
}

export function WalletPasswordCard() {
  const walletPasswordTranslations = useTranslations("wallet.passwordChange");
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [visiblePasswords, setVisiblePasswords] = useState(PASSWORD_VISIBILITY_DEFAULTS);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [currentPasswordServerError, setCurrentPasswordServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitInFlightRef = useRef(false);

  const passwordsDoNotMatch =
    passwordForm.newPassword &&
    passwordForm.confirmPassword &&
    passwordForm.newPassword !== passwordForm.confirmPassword;

  const passwordFieldsAreBlank =
    !passwordForm.currentPassword.trim() ||
    !passwordForm.newPassword.trim() ||
    !passwordForm.confirmPassword.trim();

  const updatePasswordField = (fieldName, fieldValue) => {
    if (fieldName === "currentPassword") {
      setCurrentPasswordServerError("");
    }
    setPasswordForm((currentPasswordForm) => ({
      ...currentPasswordForm,
      [fieldName]: fieldValue,
    }));
  };

  const togglePasswordVisibility = (fieldName) => {
    setVisiblePasswords((currentVisiblePasswords) => ({
      ...currentVisiblePasswords,
      [fieldName]: !currentVisiblePasswords[fieldName],
    }));
  };

  const getPasswordFieldError = (fieldName) => {
    if (submitAttempted && !passwordForm[fieldName].trim()) {
      return walletPasswordTranslations("requiredError");
    }
    if (fieldName === "currentPassword" && currentPasswordServerError) {
      return currentPasswordServerError;
    }
    if (fieldName === "confirmPassword" && passwordsDoNotMatch) {
      return walletPasswordTranslations("mismatchError");
    }
    return "";
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (submitInFlightRef.current) return;

    setSubmitAttempted(true);
    setCurrentPasswordServerError("");
    if (passwordFieldsAreBlank || passwordsDoNotMatch) return;

    submitInFlightRef.current = true;
    setIsSubmitting(true);
    try {
      await changeWalletPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setSubmitAttempted(false);
      addToast({
        color: "success",
        description: walletPasswordTranslations("successToast"),
      });
    } catch (passwordChangeError) {
      if (passwordChangeError.status === 401) {
        setCurrentPasswordServerError(walletPasswordTranslations("currentPasswordIncorrectError"));
        return;
      }
      addToast({
        color: "danger",
        description: walletPasswordTranslations("errorToast"),
      });
    } finally {
      submitInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg mt-6">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {walletPasswordTranslations("title")}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          {walletPasswordTranslations("description")}
        </p>
      </CardHeader>

      <CardBody>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label={walletPasswordTranslations("currentPasswordLabel")}
              type={visiblePasswords.currentPassword ? "text" : "password"}
              value={passwordForm.currentPassword}
              onChange={(changeEvent) => updatePasswordField("currentPassword", changeEvent.target.value)}
              isDisabled={isSubmitting}
              isInvalid={Boolean(getPasswordFieldError("currentPassword"))}
              errorMessage={getPasswordFieldError("currentPassword")}
              endContent={(
                <PasswordVisibilityButton
                  isVisible={visiblePasswords.currentPassword}
                  onToggle={() => togglePasswordVisibility("currentPassword")}
                  label={walletPasswordTranslations("toggleCurrentPassword")}
                />
              )}
            />

            <Input
              label={walletPasswordTranslations("newPasswordLabel")}
              type={visiblePasswords.newPassword ? "text" : "password"}
              value={passwordForm.newPassword}
              onChange={(changeEvent) => updatePasswordField("newPassword", changeEvent.target.value)}
              isDisabled={isSubmitting}
              isInvalid={Boolean(getPasswordFieldError("newPassword"))}
              errorMessage={getPasswordFieldError("newPassword")}
              endContent={(
                <PasswordVisibilityButton
                  isVisible={visiblePasswords.newPassword}
                  onToggle={() => togglePasswordVisibility("newPassword")}
                  label={walletPasswordTranslations("toggleNewPassword")}
                />
              )}
            />

            <Input
              label={walletPasswordTranslations("confirmPasswordLabel")}
              type={visiblePasswords.confirmPassword ? "text" : "password"}
              value={passwordForm.confirmPassword}
              onChange={(changeEvent) => updatePasswordField("confirmPassword", changeEvent.target.value)}
              isDisabled={isSubmitting}
              isInvalid={Boolean(getPasswordFieldError("confirmPassword"))}
              errorMessage={getPasswordFieldError("confirmPassword")}
              endContent={(
                <PasswordVisibilityButton
                  isVisible={visiblePasswords.confirmPassword}
                  onToggle={() => togglePasswordVisibility("confirmPassword")}
                  label={walletPasswordTranslations("toggleConfirmPassword")}
                />
              )}
            />
          </div>

          <div className="flex justify-end">
            <Button
              color="primary"
              type="submit"
              className="bg-green-800 h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium"
              isDisabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {walletPasswordTranslations("submitButton")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
