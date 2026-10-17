"use client";

import { useEffect, useState } from "react";

import { Button, Divider } from "@heroui/react";
import { useTranslations } from "next-intl";

import { parseJsonResponse } from "@/lib/http";
import { LanguageSwitcher } from "@i18n/I18nProvider";
import { getInitialSetupStatus } from "@services/initialSetupService";

import { BusinessDetailsStep } from "./AddBusinessData";
import { UserAccountStep } from "./AddUserAccount";
import { useOnboardingSubmit } from "./hooks/useOnboardingSubmit";
import { RestoreFromBackupStep } from "./RestoreFromBackup";
import { SecretsEncryptionStep } from "./SecretsEncryptionStep";
import { BusinessTypeStep } from "./SelectBusiness";
import { WizardSummary } from "./StepsSummary";
import { WalletBackendStep } from "./WalletBackendStep";

const NWC_URI_REGEX = /^nostr\+walletconnect:\/\/[0-9a-f]{64}\?/;

function isPasswordStrong(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);
}

function isPinValid(pin) {
  return /^\d{4}$/.test(pin);
}

const STEP_VALIDATORS = {
  1: (onboardingData) => Boolean(onboardingData.businessType),
  2: (onboardingData) => (
    Boolean(onboardingData.userName) &&
    Boolean(onboardingData.userPassword) &&
    Boolean(onboardingData.userPasswordConfirmation) &&
    onboardingData.userPassword === onboardingData.userPasswordConfirmation &&
    isPasswordStrong(onboardingData.userPassword) &&
    isPinValid(onboardingData.userPin)
  ),
  3: (onboardingData) => (
    Boolean(onboardingData.businessName) &&
    Boolean(onboardingData.businessCurrency) &&
    Boolean(onboardingData.timezone) &&
    (onboardingData.businessType !== "freelance" || Boolean(onboardingData.businessProfession))
  ),
  4: (onboardingData) => (
    onboardingData.walletBackend !== "nwc" ||
    (Boolean(onboardingData.nwcUri) && NWC_URI_REGEX.test(onboardingData.nwcUri))
  ),
};

export function Onboarding() {
  const onboardingTranslations = useTranslations();
  const [step, setStep] = useState(1);
  const [activeView, setActiveView] = useState("setup");
  const [setupStatus, setSetupStatus] = useState(null);
  const [onboardingData, setOnboardingData] = useState({
    businessType: "store",
    walletBackend: "phoenixd",
    nwcUri: "",
    phoenixdRemote: false,
    phoenixdUrl: "",
    phoenixdPassword: "",
    activateSecretsEncryption: false,
    userName: "",
    userPassword: "",
    userPasswordConfirmation: "",
    userPin: "",
    businessName: "",
    businessProfession: "",
    businessAddress: "",
    businessPhone: "",
    businessEmail: "",
    businessRFC: "",
    businessCurrency: "USD",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    businessLogo: null,
  });
  const needsBusinessType = setupStatus?.needsBusinessType === true;
  const { handleComplete, isSubmittingSetup } = useOnboardingSubmit({ onboardingData, needsBusinessType });

  useEffect(() => {
    let isMounted = true;
    const loadStatus = async () => {
      try {
        const statusResponse = await getInitialSetupStatus();
        const statusData = await parseJsonResponse(statusResponse, null);
        if (!isMounted) return;
        setSetupStatus(statusData);
        if (statusData?.needsBusinessType) {
          setOnboardingData((previousOnboardingData) => ({ ...previousOnboardingData, businessType: "" }));
        }
      } catch {
        if (!isMounted) return;
        setSetupStatus({ initialized: false, needsBusinessType: false });
      }
    };

    loadStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleOnboardingDataChange = (updatedOnboardingFields) => {
    setOnboardingData((previousOnboardingData) => ({ ...previousOnboardingData, ...updatedOnboardingFields }));
  };

  const totalSteps = needsBusinessType ? 1 : 6;
  const progressValue = totalSteps === 1 ? 100 : ((step - 1) / (totalSteps - 1)) * 100;
  const isCurrentStepValid = STEP_VALIDATORS[step]?.(onboardingData) ?? true;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen gradient-fresh px-4 pb-4 pt-4">
      <div className="flex justify-end w-full max-w-2xl mt-2 mb-4 sm:mt-4 sm:mb-8">
        <LanguageSwitcher compact />
      </div>

      <div className="w-full max-w-2xl">

        {activeView === "restore" ? (
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 mb-8">
            <RestoreFromBackupStep onBack={() => setActiveView("setup")} />
          </div>
        ) : (
          <>
            {!needsBusinessType && (
            <div className="mb-8">
              <div className="flex justify-between items-center relative">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 md:h-3 rounded-full bg-gray-300 z-0" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-2 md:h-3 rounded-full bg-green-800 z-0 transition-all duration-300 left-0"
                  style={{ width: `${progressValue}%` }}
                />
                {[1, 2, 3, 4, 5, 6].map((stepNumber) => (
                  <div
                    key={stepNumber}
                    className={`relative z-10 flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full text-sm md:text-base font-semibold transition-all ${stepNumber <= step ? "bg-green-800 text-white" : "bg-gray-300 text-gray-500"}`}
                  >
                    {stepNumber}
                  </div>
                ))}
              </div>
            </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 mb-8">
              {step === 1 && (
              <BusinessTypeStep
                businessType={onboardingData.businessType}
                onChange={(businessType) => handleOnboardingDataChange({ businessType })}
              />
              )}

              {step === 1 && setupStatus?.initialized === false && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setActiveView("restore")}
                  className="text-sm text-green-800 underline hover:text-green-900 cursor-pointer transition-colors"
                >
                  {onboardingTranslations("restore.toggleLink")}
                </button>
              </div>
              )}

              {step === 2 && (
              <UserAccountStep
                userAccountData={{
                  userName: onboardingData.userName,
                  userPassword: onboardingData.userPassword,
                  userPasswordConfirmation: onboardingData.userPasswordConfirmation,
                  userPin: onboardingData.userPin,
                }}
                onChange={(updatedUserAccountFields) => handleOnboardingDataChange(updatedUserAccountFields)}
              />
              )}

              {step === 3 && (
              <BusinessDetailsStep
                businessData={{
                  businessType: onboardingData.businessType,
                  businessName: onboardingData.businessName,
                  businessProfession: onboardingData.businessProfession,
                  businessAddress: onboardingData.businessAddress,
                  businessPhone: onboardingData.businessPhone,
                  businessEmail: onboardingData.businessEmail,
                  businessRFC: onboardingData.businessRFC,
                  businessCurrency: onboardingData.businessCurrency,
                  timezone: onboardingData.timezone,
                  businessLogo: onboardingData.businessLogo,
                }}
                onChange={(updatedBusinessFields) => handleOnboardingDataChange(updatedBusinessFields)}
              />
              )}

              {step === 4 && (
              <WalletBackendStep
                walletBackendData={{
                  walletBackend: onboardingData.walletBackend,
                  nwcUri: onboardingData.nwcUri,
                  phoenixdRemote: onboardingData.phoenixdRemote,
                  phoenixdUrl: onboardingData.phoenixdUrl,
                  phoenixdPassword: onboardingData.phoenixdPassword,
                }}
                onChange={(updatedWalletBackendFields) => handleOnboardingDataChange(updatedWalletBackendFields)}
              />
              )}

              {step === 5 && (
              <SecretsEncryptionStep
                secretsEncryptionData={{
                  activateSecretsEncryption: onboardingData.activateSecretsEncryption,
                }}
                onChange={(updatedSecretsEncryptionFields) => handleOnboardingDataChange(updatedSecretsEncryptionFields)}
              />
              )}

              {step === 6 && <WizardSummary onboardingData={onboardingData} onEdit={(stepNum) => setStep(stepNum)} />}

              <Divider className="hidden md:block my-8 bg-gray-400" />

              <div className="flex w-full mt-6 md:mt-0">
                {(!needsBusinessType && step !== 1) && (
                <Button
                  variant="bordered"
                  onPress={handlePrevious}
                  className="px-6 py-2 border border-border text-foreground hover:bg-muted transition-colors"
                >
                  {onboardingTranslations("buttons.back")}
                </Button>
                )}

                <div className="ml-auto">
                  {needsBusinessType ? (
                    <Button
                      color="primary"
                      onPress={handleComplete}
                      isDisabled={!onboardingData.businessType || isSubmittingSetup}
                      isLoading={isSubmittingSetup}
                      className="bg-green-800"
                    >
                      {onboardingTranslations("buttons.finish")}
                    </Button>
                  ) : step < 6 ? (
                    <Button
                      color="primary"
                      onPress={handleNext}
                      isDisabled={!isCurrentStepValid}
                      className="bg-green-800"
                    >
                      {onboardingTranslations("buttons.next")}
                    </Button>
                  ) : (
                    <Button
                      color="primary"
                      onPress={handleComplete}
                      isDisabled={isSubmittingSetup}
                      isLoading={isSubmittingSetup}
                      className="bg-green-800"
                    >
                      {onboardingTranslations("buttons.finish")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
