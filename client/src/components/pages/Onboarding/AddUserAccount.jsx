"use client";

import { useState } from "react";

import { Input, Tooltip } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

export function UserAccountStep({ userAccountData, onChange }) {
  const userAccountTranslations = useTranslations();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handlePasswordChange = (password) => {
    onChange({ ...userAccountData, userPassword: password });

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const passwordsMatch = userAccountData.userPassword === userAccountData.userPasswordConfirmation;

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return "bg-muted";
    if (passwordStrength === 1) return "bg-red-500";
    if (passwordStrength === 2) return "bg-yellow-500";
    if (passwordStrength === 3) return "bg-emerald-500";
    return "bg-green-600";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength === 1) return userAccountTranslations("step2.strength.weak");
    if (passwordStrength === 2) return userAccountTranslations("step2.strength.regular");
    if (passwordStrength === 3) return userAccountTranslations("step2.strength.good");
    return userAccountTranslations("step2.strength.strong");
  };

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-green-900 mb-2">{userAccountTranslations("step2.title")}</h2>
      <p className="text-gray-500 mb-4 md:mb-8">{userAccountTranslations("step2.subtitle")}</p>

      <div className="space-y-4 md:space-y-6">
        <Input
          label={userAccountTranslations("step2.fields.userNameLabel")}
          type="text"
          placeholder={userAccountTranslations("step2.fields.userNamePlaceholder")}
          value={userAccountData.userName}
          onChange={(event) => onChange({ ...userAccountData, userName: event.target.value })}
        />

        <Tooltip
          content={(
            <div className="px-1 py-2">
              <div className="text-small font-bold">{userAccountTranslations("step2.fields.userPinLabel")}</div>
              <div className="text-tiny">{userAccountTranslations("step2.tooltips.userPin")}</div>
            </div>
          )}
          showArrow
          delay={10}
          placement="top-end"
        >
          <div className="relative">
            <Input
              label={userAccountTranslations("step2.fields.userPinLabel")}
              type={showPin ? "text" : "password"}
              placeholder={userAccountTranslations("step2.fields.userPinPlaceholder")}
              maxLength={6}
              value={userAccountData.userPin}
              onChange={(event) => {
                const onlyNumbers = event.target.value.replace(/\D/g, "");
                onChange({ ...userAccountData, userPin: onlyNumbers });
              }}
              endContent={(
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              )}
            />
          </div>
        </Tooltip>

        <Tooltip
          content={(
            <div className="px-1 py-2">
              <div className="text-small font-bold">{userAccountTranslations("step2.fields.passwordLabel")}</div>
              <div className="text-tiny">{userAccountTranslations("step2.tooltips.userPassword")}</div>
            </div>
          )}
          showArrow
          delay={10}
          placement="top-end"
        >
          <div className="relative">
            <Input
              aria-label="hide-show-password"
              label={userAccountTranslations("step2.fields.passwordLabel")}
              type={showPassword ? "text" : "password"}
              placeholder={userAccountTranslations("step2.fields.passwordPlaceholder")}
              value={userAccountData.userPassword}
              onChange={(event) => handlePasswordChange(event.target.value)}
              endContent={(
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              )}
            />
          </div>
        </Tooltip>

        <div className="relative">
          <Input
            aria-label="confirm-password"
            label={userAccountTranslations("step2.fields.confirmPasswordLabel")}
            type={showConfirmPassword ? "text" : "password"}
            placeholder={userAccountTranslations("step2.fields.confirmPasswordPlaceholder")}
            value={userAccountData.userPasswordConfirmation}
            onChange={(event) => onChange({ ...userAccountData, userPasswordConfirmation: event.target.value })}
            isInvalid={userAccountData.userPasswordConfirmation && !passwordsMatch}
            errorMessage={userAccountData.userPasswordConfirmation && !passwordsMatch ? userAccountTranslations("step2.passwordsDoNotMatch") : ""}
            endContent={(
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
          />
        </div>

        <div>
          {userAccountData.userPassword && (
            <div className="mt-3">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((strengthLevel) => (
                  <div
                    key={strengthLevel}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      strengthLevel <= passwordStrength ? getPasswordStrengthColor() : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {userAccountTranslations("step2.strength.title")}: <span className="font-medium">{getPasswordStrengthText()}</span>
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {userAccountTranslations("step2.passwordSecure")}
          </p>
        </div>
      </div>
    </div>
  );
}
