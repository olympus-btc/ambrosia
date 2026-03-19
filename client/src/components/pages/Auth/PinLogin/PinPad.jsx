import { useEffect } from "react";

import { Button, Input } from "@heroui/react";
import { Delete, LogIn, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

const NUMBER_PAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", ""],
];

export function PinPad({ pin, error, isLoading, onNumberClick, onDelete, onClear, onLogin }) {
  const t = useTranslations("pinLogin");

  useEffect(() => {
    function handleKeyDown(e) {
      if (isLoading) return;
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
  }, [isLoading, onNumberClick, onDelete, onClear, onLogin]);

  return (
    <>
      <Input
        label={t("pinLabel")}
        type="password"
        value={pin}
        readOnly
        placeholder="----"
        maxLength={4}
        isInvalid={!!error}
        errorMessage={error}
      />

      <div className="grid grid-cols-3 gap-4">
        {NUMBER_PAD.flat().map((number, index) => (
          <Button
            key={index}
            color="default"
            variant={number ? "bordered" : "light"}
            size="lg"
            className={`h-14 text-xl font-bold bg-white border border-primary-400 shadow-sm hover:shadow-md active:scale-95 transition-all ${!number && "invisible"}`}
            onPress={() => number && onNumberClick(number)}
            isDisabled={isLoading || !number}
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
          isDisabled={isLoading || pin.length === 0}
          startContent={<Delete className="w-4 h-4" />}
          className="border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t("eraseButton")}
        </Button>
        <Button
          variant="bordered"
          size="md"
          onPress={onClear}
          isDisabled={isLoading || pin.length === 0}
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
        isDisabled={pin.length === 0}
        isLoading={isLoading}
        startContent={!isLoading && <LogIn className="w-5 h-5" />}
      >
        {isLoading ? t("loading") : t("loginButton")}
      </Button>
    </>
  );
}
