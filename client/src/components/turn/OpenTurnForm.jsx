"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Button, NumberInput, addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useTurn } from "@/hooks/turn/useTurn";

export default function OpenTurnForm({ onOpened }) {
  const [initialAmount, setInitialAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const { updateTurn, openShift, refreshTurn } = useTurn();
  const router = useRouter();

  const shiftTranslations = useTranslations("shifts");

  const handleAmountChange = (value) => {
    setInitialAmount(value);
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isLoading) return;
    setFormError("");

    if (initialAmount == null || isNaN(Number(initialAmount)) || initialAmount < 0) {
      setFormError(shiftTranslations("invalidAmount"));
      return;
    }

    setIsLoading(true);
    try {
      const openedShiftId = await openShift(initialAmount);
      updateTurn(openedShiftId);
      onOpened?.(openedShiftId);
      addToast({ color: "success", description: shiftTranslations("openShiftSuccess") });
    } catch (caughtError) {
      if (caughtError?.message === "shift_already_open") {
        await refreshTurn();
      } else {
        setFormError(shiftTranslations("openShiftError"));
        addToast({
          color: "danger",
          description: caughtError?.responseMessage || caughtError?.message || shiftTranslations("openShiftError"),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {formError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-base text-center">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
        <NumberInput
          label={shiftTranslations("initialAmount")}
          isRequired
          isDisabled={isLoading}
          startContent={
            <span className="text-default-400 text-small">$</span>
          }
          minValue={0}
          value={initialAmount}
          onValueChange={handleAmountChange}
          step={0.1}
          classNames={{ inputWrapper: "shadow-none" }}
        />

        <div className="flex justify-between">
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={() => router.back()}
          >
            {shiftTranslations("cancel")}
          </Button>

          <Button
            color="primary"
            className="bg-green-800"
            type="submit"
            isLoading={isLoading}
          >
            {isLoading ? shiftTranslations("openingShift") : shiftTranslations("openShiftButton")}
          </Button>
        </div>

      </form>
    </div>
  );
}
