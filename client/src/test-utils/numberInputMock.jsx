import { useState } from "react";

const formatValue = (value) => (Number.isFinite(Number(value)) && value !== null && value !== ""
  ? String(value)
  : "");

export function NumberInputMock({
  label,
  "aria-label": ariaLabel,
  value,
  onValueChange,
  onChange,
  onKeyDown,
  minValue,
  maxValue,
  step = 1,
  isDisabled,
  placeholder,
  "data-testid": testId,
}) {
  const [inputText, setInputText] = useState(() => formatValue(value));
  const [previousValue, setPreviousValue] = useState(value);
  const accessibleLabel = ariaLabel ?? label;

  if (!Object.is(value, previousValue)) {
    setPreviousValue(value);
    setInputText(formatValue(value));
  }

  const emitNumericValue = (numericValue) => {
    const clampedValue = (() => {
      if (Number.isNaN(numericValue)) return NaN;
      if (minValue != null && numericValue < minValue) return minValue;
      if (maxValue != null && numericValue > maxValue) return maxValue;
      return numericValue;
    })();

    setInputText(formatValue(clampedValue));
    onValueChange?.(clampedValue);
    onChange?.(clampedValue);
  };

  const stepBy = (direction) => {
    const currentValue = Number.isFinite(Number(inputText)) && inputText !== ""
      ? Number(inputText)
      : 0;
    emitNumericValue(currentValue + (direction * Number(step)));
  };

  const commit = () => {
    emitNumericValue(parseFloat(inputText.replace(/[^0-9.-]/g, "")));
  };

  return (
    <div>
      <input
        aria-label={accessibleLabel}
        data-testid={testId}
        disabled={isDisabled}
        placeholder={placeholder}
        value={inputText}
        onChange={(domChangeEvent) => {
          setInputText(domChangeEvent.target.value);
          onChange?.(domChangeEvent);
        }}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        aria-label={`${accessibleLabel} increment`}
        onClick={() => stepBy(1)}
      />
      <button
        type="button"
        aria-label={`${accessibleLabel} decrement`}
        onClick={() => stepBy(-1)}
      />
    </div>
  );
}
