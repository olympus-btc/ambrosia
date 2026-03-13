"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Button, NumberInput } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useTurn } from "@/hooks/turn/useTurn";

export default function OpenTurnForm({ onOpened }) {
  const [initialAmount, setInitialAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { updateTurn, openShift, refreshTurn } = useTurn();
  const router = useRouter();

  const t = useTranslations("shifts");

  const handleAmountChange = (value) => {
    setInitialAmount(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (initialAmount == null || isNaN(Number(initialAmount)) || initialAmount < 0) {
      setError(t("invalidAmount"));
      return;
    }

    setIsLoading(true);
    try {
      const id = await openShift(initialAmount);
      updateTurn(id);
      onOpened?.(id);
    } catch (err) {
      if (err?.message === "shift_already_open") {
        await refreshTurn();
      } else {
        setError(t("openShiftError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-base text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
        <NumberInput
          label={t("initialAmount")}
          isRequired
          isDisabled={isLoading}
          startContent={
            <span className="text-default-400 text-small">$</span>
          }
          minValue={0}
          value={initialAmount}
          onValueChange={handleAmountChange}
          step={0.1}
        />

        <div className="flex justify-between">
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={() => router.back()}
          >
            {t("cancel")}
          </Button>

          <Button
            color="primary"
            className="bg-green-800"
            type="submit"
            isLoading={isLoading}
          >
            {isLoading ? t("openingShift") : t("openShiftButton")}
          </Button>
        </div>

      </form>
    </div>
  );
}
