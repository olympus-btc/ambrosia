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
      <div className="space-y-2">
        <label className="text-sm font-semibold text-deep">
          {t("pinLabel")}
        </label>
        <Input
          type="password"
          variant="bordered"
          value={pin}
          readOnly
          size="lg"
          placeholder="----"
          maxLength={4}
        />
        {error && (
          <div className="text-red-600 text-base text-center font-semibold bg-red-50 p-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {NUMBER_PAD.flat().map((number, index) => (
          <Button
            key={index}
            variant={number ? "bordered" : "ghost"}
            size="md"
            className={`h-14 text-xl font-bold transition-all duration-200 ${
              number
                ? "border-2 border-mint bg-cream/50 hover:bg-mint hover:text-deep hover:border-forest active:scale-95 shadow-md"
                : "invisible"
            }`}
            onPress={() => number && onNumberClick(number)}
            disabled={isLoading || !number}
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
          disabled={isLoading || pin.length === 0}
          className="h-12 text-base font-semibold border-2 border-lime bg-lime/20 hover:bg-lime hover:text-deep active:scale-95"
        >
          <Delete className="w-4 h-4 mr-2" />
          {t("eraseButton")}
        </Button>
        <Button
          variant="bordered"
          size="md"
          onPress={onClear}
          disabled={isLoading || pin.length === 0}
          className="h-12 text-base font-semibold border-2 border-lime bg-lime/20 hover:bg-lime hover:text-deep active:scale-95"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t("clearButton")}
        </Button>
      </div>

      <Button
        onPress={onLogin}
        disabled={isLoading || pin.length === 0}
        size="md"
        className="w-full h-14 text-lg font-bold gradient-forest text-white shadow-lg active:scale-95 transition-all duration-200 border-0"
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3" />
            {t("loading")}
          </div>
        ) : (
          <>
            <LogIn className="w-5 h-5 mr-2" />
            {t("loginButton")}
          </>
        )}
      </Button>
    </>
  );
}
