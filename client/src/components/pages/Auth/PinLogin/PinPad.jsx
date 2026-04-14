import { useEffect, useState } from "react";

import { Button, Input } from "@heroui/react";
import { Delete, LogIn, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

const NUMBER_PAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", ""],
];

export function PinPad({ pin, error, isLoading, lockedUntil, onNumberClick, onDelete, onClear, onLogin, onLockoutExpired }) {
  const t = useTranslations("pinLogin");
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setSecondsLeft(0);
        onLockoutExpired?.();
      } else {
        setSecondsLeft(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil, onLockoutExpired]);

  const isLocked = secondsLeft > 0;

  useEffect(() => {
    function handleKeyDown(e) {
      if (isLoading || isLocked) return;
      if (e.key >= "0" && e.key <= "9") {
        onNumberClick(e.key);
      } else if (e.key === "Backspace") {
        onDelete();
      } else if (e.key === "Delete") {
        onClear();
      } else if (e.key === "Enter") {
        onLogin();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, isLocked, onNumberClick, onDelete, onClear, onLogin]);

  return (
    <>
      <Input
        label={t("pinLabel")}
        type="password"
        value={pin}
        readOnly
        placeholder="----"
        maxLength={4}
        isInvalid={!!error && !isLocked}
      />

      {isLocked ? (
        <div className="text-warning text-base text-center font-semibold bg-warning-50 p-3 rounded-lg border border-warning-200">
          {t("lockout.message")} {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
        </div>
      ) : error ? (
        <div className="text-danger text-base text-center font-semibold bg-danger-50 p-3 rounded-lg border border-danger-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-4">
        {NUMBER_PAD.flat().map((number, index) => (
          <Button
            key={index}
            color="default"
            variant={number ? "bordered" : "light"}
            size="lg"
            className={`h-14 text-xl font-bold bg-white border border-primary-400 shadow-sm hover:shadow-md active:scale-95 transition-all ${!number && "invisible"}`}
            onPress={() => number && onNumberClick(number)}
            isDisabled={isLoading || isLocked || !number}
          >
            {number}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="bordered"
          size="md"
          onPress={onDelete}
          isDisabled={isLoading || isLocked || pin.length === 0}
          startContent={<Delete className="w-4 h-4" />}
          className="border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t("eraseButton")}
        </Button>
        <Button
          variant="bordered"
          size="md"
          onPress={onClear}
          isDisabled={isLoading || isLocked || pin.length === 0}
          startContent={<Trash2 className="w-4 h-4" />}
          className="border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t("clearButton")}
        </Button>
      </div>

      <Button
        color="primary"
        size="lg"
        className="w-full"
        onPress={onLogin}
        isDisabled={isLocked || pin.length === 0}
        isLoading={isLoading}
        startContent={!isLoading && <LogIn className="w-5 h-5" />}
      >
        {isLoading ? t("loading") : t("loginButton")}
      </Button>
    </>
  );
}
