"use client";

export const DEFAULT_STYLE = {
  bold: false,
  justification: "LEFT",
  fontSize: "NORMAL",
};

export function createElement() {
  return {
    localId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "TEXT",
    value: "",
    style: DEFAULT_STYLE,
  };
}
