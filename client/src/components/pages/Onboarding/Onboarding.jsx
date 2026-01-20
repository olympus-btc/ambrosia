"use client";

import { useEffect, useState } from "react";

import { Button, Progress, Divider, addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useUpload } from "@components/hooks/useUpload";
import { getInitialSetupStatus, submitInitialSetup } from "@services/initialSetupService";

import { BusinessDetailsStep } from "./AddBusinessData";
import { UserAccountStep } from "./AddUserAccount";
import { BusinessTypeStep } from "./SelectBusiness";
import { WizardSummary } from "./StepsSummary";

export function Onboarding() {
  const t = useTranslations();
  const [step, setStep] = useState(1);
  const [setupStatus, setSetupStatus] = useState(null);
  const [data, setData] = useState({
    businessType: "store",
    userName: "",
    userPassword: "",
    userPin: "",
    businessName: "",
    businessAddress: "",
    businessPhone: "",
    businessEmail: "",
    businessRFC: "",
    businessCurrency: "USD",
    businessLogo: null,
  });
  const { upload } = useUpload();
  const needsBusinessType = setupStatus?.needsBusinessType === true;

  useEffect(() => {
    let isMounted = true;
    const loadStatus = async () => {
      try {
        const status = await getInitialSetupStatus();
        if (!isMounted) return;
        setSetupStatus(status);
        if (status?.needsBusinessType) {
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
    return /^\d{4}$/.test(pin);
  }

  const handleNext = () => {
    if (step < 4) {
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
    try {
      if (needsBusinessType) {
        await submitInitialSetup({
          businessType: data.businessType,
        });
        addToast({
          title: t("submitOnboardingToast.title"),
          description: t("submitOnboardingToast.description"),
          color: "success",
        });
        window.location.reload();
        return;
      }

      let logoUrl = null;
      if (data.businessLogo) {
        const [uploaded] = await upload([data.businessLogo]);
        logoUrl = uploaded?.url ?? uploaded?.path;
      }

      await submitInitialSetup({
        ...data,
        businessLogoUrl: logoUrl,
        businessLogo: undefined,
      });
      addToast({
        title: t("submitOnboardingToast.title"),
        description: t("submitOnboardingToast.description"),
        color: "success",
      });
      window.location.reload();
    } catch (error) {
      addToast({
        title: "Error",
        description: error.message,
        color: "danger",
      });
    }
  };

  const totalSteps = needsBusinessType ? 1 : 4;
  const progressValue = totalSteps === 1 ? 100 : ((step - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="flex items-start justify-center min-h-screen gradient-fresh px-4 pb-4 pt-16">
      <div className="w-full max-w-2xl">

        {!needsBusinessType && (
          <div className="mb-8 relative">
            <div className="flex justify-between mb-2 relative z-10">
              {[1, 2, 3, 4].map((num) => (
                <div
                  key={num}
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${num <= step ? "bg-primary text-primary-foreground" : "bg-gray-300 text-muted-foreground"
                    }`}
                >
                  {num}
                </div>
              ))}
            </div>
            <div className="w-full rounded-full h-2 absolute top-[15px] z-0">
              <Progress size="md" color="primary" value={progressValue} />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
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
                businessLogo: data.businessLogo,
              }}
              onChange={(businessData) => handleDataChange(businessData)}
            />
          )}

          {step === 4 && <WizardSummary data={data} onEdit={(stepNum) => setStep(stepNum)} />}

          <Divider className="my-8 bg-gray-400" />

          <div className="flex justify-between">
            {!needsBusinessType && (
              <Button
                variant="bordered"
                onPress={handlePrevious}
                isDisabled={step === 1}
                className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t("buttons.back")}
              </Button>
            )}

            {needsBusinessType ? (
              <Button
                color="primary"
                onPress={handleComplete}
                isDisabled={!data.businessType}
                className="gradient-forest text-white"
              >
                {t("buttons.finish")}
              </Button>
            ) : step < 4 ? (
              <Button
                color="primary"
                onPress={handleNext}
                isDisabled={
                  (step === 1 && !data.businessType) ||
                  (step === 2 && (!data.userName || !data.userPassword || !isPasswordStrong(data.userPassword) || !isPinValid(data.userPin))) ||
                  (step === 3 && (!data.businessName))
                }
                className="gradient-forest text-white"
              >
                {t("buttons.next")}
              </Button>
            ) : (
              <Button
                color="primary"
                onPress={handleComplete}
                className="gradient-forest text-white"
              >
                {t("buttons.finish")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
