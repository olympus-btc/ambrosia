const DIFFERENCE_TONES = {
  [-1]: { textClass: "text-red-600", hex: "#dc2626" },
  [0]: { textClass: "text-green-600", hex: "#16a34a" },
  [1]: { textClass: "text-orange-500", hex: "#f97316" },
};

export function differenceTextClass(shiftDifference) {
  if (shiftDifference == null) return "text-gray-400";
  return DIFFERENCE_TONES[Math.sign(shiftDifference)].textClass;
}

export function differenceBarColor(shiftDifference) {
  return DIFFERENCE_TONES[Math.sign(shiftDifference)].hex;
}
