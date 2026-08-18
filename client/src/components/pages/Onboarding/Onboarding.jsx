"use client";

import { useEffect, useRef, useState } from "react";

import { Button, Divider, addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { parseJsonResponse } from "@/lib/http";
import { useUpload } from "@components/hooks/useUpload";
import { LanguageSwitcher } from "@i18n/I18nProvider";
import { getInitialSetupStatus, submitInitialSetup } from "@services/initialSetupService";

import { BusinessDetailsStep } from "./AddBusinessData";
import { UserAccountStep } from "./AddUserAccount";
import { BusinessTypeStep } from "./SelectBusiness";
import { WizardSummary } from "./StepsSummary";
import { WalletBackendStep } from "./WalletBackendStep";

const TOAST_REDIRECT_TIMEOUT_MS = 3000;

function addRedirectToast(toastProps) {
  addToast({
    ...toastProps,
    timeout: TOAST_REDIRECT_TIMEOUT_MS,
    shouldShowTimeoutProgress: true,
  });
}

export function Onboarding() {
  const onboardingTranslations = useTranslations();
  const [step, setStep] = useState(1);
  const [setupStatus, setSetupStatus] = useState(null);
  const [isSubmittingSetup, setIsSubmittingSetup] = useState(false);
  const isSubmittingSetupRef = useRef(false);
  const [data, setData] = useState({
    businessType: "store",
    walletBackend: "phoenixd",
    nwcUri: "",
    userName: "",
    userPassword: "",
    userPasswordConfirmation: "",
    userPin: "",
    businessName: "",
    businessAddress: "",
    businessPhone: "",
    businessEmail: "",
    businessRFC: "",
    businessCurrency: "USD",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    businessLogo: null,
  });
  const { upload } = useUpload();
  const needsBusinessType = setupStatus?.needsBusinessType === true;

  useEffect(() => {
    let isMounted = true;
    const loadStatus = async () => {
      try {
        const status = await getInitialSetupStatus();
        const statusData = await parseJsonResponse(status, null);
        if (!isMounted) return;
        setSetupStatus(statusData);
        if (statusData?.needsBusinessType) {
          setData((prev) => ({ ...prev, businessType: "" }));
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

  function isPasswordStrong(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);
  }

  function isPinValid(pin) {
    return /^\d{6}$/.test(pin);
  }

  const NWC_URI_REGEX = /^nostr\+walletconnect:\/\/[0-9a-f]{64}\?/;

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleDataChange = (newData) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const handleComplete = async () => {
    if (isSubmittingSetupRef.current) return;
    isSubmittingSetupRef.current = true;
    setIsSubmittingSetup(true);

    try {
      if (needsBusinessType) {
        await submitInitialSetup({
          businessType: data.businessType,
        });
        addRedirectToast({
          title: onboardingTranslations("submitOnboardingToast.title"),
          description: onboardingTranslations("submitOnboardingToast.description"),
          color: "success",
          onClose: () => window.location.reload(),
        });
        return;
      }

      let logoUrl = null;
      if (data.businessLogo) {
        const [uploaded] = await upload([data.businessLogo]);
        logoUrl = uploaded?.url ?? uploaded?.path;
      }

      const setupResponse = await submitInitialSetup({
        ...data,
        businessLogoUrl: logoUrl,
        businessLogo: undefined,
        userPasswordConfirmation: undefined,
        walletBackend: undefined,
        nwcUri: data.walletBackend === "nwc" && data.nwcUri ? data.nwcUri : undefined,
      });

      const isNwcAttempt = data.walletBackend === "nwc";
      let nwcSaved = false;
      try {
        const body = await setupResponse.json();
        nwcSaved = Boolean(body?.nwcSaved);
      } catch {}

      addRedirectToast({
        title: onboardingTranslations("submitOnboardingToast.title"),
        description: onboardingTranslations("submitOnboardingToast.description"),
        color: "success",
        onClose: isNwcAttempt ? undefined : () => window.location.reload(),
      });

      if (nwcSaved) {
        addRedirectToast({
          title: onboardingTranslations("submitOnboardingToast.nwcSavedTitle"),
          description: onboardingTranslations("submitOnboardingToast.nwcSavedDescription"),
          color: "primary",
          onClose: () => window.location.reload(),
        });
      } else if (isNwcAttempt) {
        addRedirectToast({
          title: onboardingTranslations("submitOnboardingToast.nwcErrorTitle"),
          description: onboardingTranslations("submitOnboardingToast.nwcErrorDescription"),
          color: "danger",
          onClose: () => window.location.reload(),
        });
      }
    } catch (setupSubmissionError) {
      addToast({
        title: onboardingTranslations("submitOnboardingToast.errorTitle"),
        description: setupSubmissionError.message,
        color: "danger",
      });
    } finally {
      isSubmittingSetupRef.current = false;
      setIsSubmittingSetup(false);
    }
  };

  const totalSteps = needsBusinessType ? 1 : 5;
  const progressValue = totalSteps === 1 ? 100 : ((step - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen gradient-fresh px-4 pb-4 pt-4">
      <div className="flex justify-end w-full max-w-2xl mt-2 mb-4 sm:mt-4 sm:mb-8">
        <LanguageSwitcher compact />
      </div>

      <div className="w-full max-w-2xl">

        {!needsBusinessType && (
          <div className="mb-8">
            <div className="flex justify-between items-center relative">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 md:h-3 rounded-full bg-gray-300 z-0" />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-2 md:h-3 rounded-full bg-green-800 z-0 transition-all duration-300 left-0"
                style={{ width: `${progressValue}%` }}
              />
              {[1, 2, 3, 4, 5].map((num) => (
                <div
                  key={num}
                  className={`relative z-10 flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full text-sm md:text-base font-semibold transition-all ${num <= step ? "bg-green-800 text-white" : "bg-gray-300 text-gray-500"}`}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 mb-8">
          {step === 1 && (
            <BusinessTypeStep
              value={data.businessType}
              onChange={(businessType) => handleDataChange({ businessType })}
            />
          )}

          {step === 2 && (
            <UserAccountStep
              data={{
                userName: data.userName,
                userPassword: data.userPassword,
                userPasswordConfirmation: data.userPasswordConfirmation,
                userPin: data.userPin,
              }}
              onChange={(userData) => handleDataChange(userData)}
            />
          )}

          {step === 3 && (
            <BusinessDetailsStep
              data={{
                businessType: data.businessType,
                businessName: data.businessName,
                businessAddress: data.businessAddress,
                businessPhone: data.businessPhone,
                businessEmail: data.businessEmail,
                businessRFC: data.businessRFC,
                businessCurrency: data.businessCurrency,
                timezone: data.timezone,
                businessLogo: data.businessLogo,
              }}
              onChange={(businessData) => handleDataChange(businessData)}
            />
          )}

          {step === 4 && (
            <WalletBackendStep
              data={{ walletBackend: data.walletBackend, nwcUri: data.nwcUri }}
              onChange={(walletData) => handleDataChange(walletData)}
            />
          )}

          {step === 5 && <WizardSummary data={data} onEdit={(stepNum) => setStep(stepNum)} />}

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
                  isDisabled={!data.businessType || isSubmittingSetup}
                  isLoading={isSubmittingSetup}
                  className="bg-green-800"
                >
                  {onboardingTranslations("buttons.finish")}
                </Button>
              ) : step < 5 ? (
                <Button
                  color="primary"
                  onPress={handleNext}
                  isDisabled={
                    (step === 1 && !data.businessType) ||
                    (step === 2 && (
                      !data.userName ||
                      !data.userPassword ||
                      !data.userPasswordConfirmation ||
                      data.userPassword !== data.userPasswordConfirmation ||
                      !isPasswordStrong(data.userPassword) ||
                      !isPinValid(data.userPin)
                    )) ||
                    (step === 3 && (!data.businessName || !data.businessCurrency || !data.timezone)) ||
                    (step === 4 && data.walletBackend === "nwc" && (!data.nwcUri || !NWC_URI_REGEX.test(data.nwcUri)))
                  }
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
      </div>
    </div>
  );
}
