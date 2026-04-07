"use client";

import { DEFAULT_STYLE } from "../defaults";

import { ElementLineBreak } from "./ElementLineBreak";
import { ElementQrCode } from "./ElementQrCode";
import { ElementSeparator } from "./ElementSeparator";
import { ElementTableRow } from "./ElementTableRow";
import { ElementText } from "./ElementText";
import { ElementTotalRow } from "./ElementTotalRow";

const fontSizeClasses = {
  NORMAL: "text-sm",
  LARGE: "text-base",
  EXTRA_LARGE: "text-lg",
};

function resolveAlignment(justification) {
  if (justification === "CENTER") return "text-center";
  if (justification === "RIGHT") return "text-right";
  return "text-left";
}

export function TicketElementsPreview({ elements, config }) {
  if (!Array.isArray(elements) || elements.length === 0) {
    return null;
  }

  return elements.flatMap((element) => {
    const style = element.style || DEFAULT_STYLE;
    const className = [
      resolveAlignment(style.justification),
      fontSizeClasses[style.fontSize] || fontSizeClasses.NORMAL,
      style.bold ? "font-semibold" : "font-normal",
    ].join(" ");

    if (element.type === "SEPARATOR") {
      return [<ElementSeparator key={`${element.localId}-sep`} />];
    }
    if (element.type === "LINE_BREAK") {
      return [<ElementLineBreak key={`${element.localId}-break`} />];
    }
    if (element.type === "QRCODE") {
      return [
        <ElementQrCode
          key={`${element.localId}-qr`}
          value={element.value}
          config={config}
          className={className}
        />,
      ];
    }
    if (element.type === "TABLE_ROW") {
      return ElementTableRow({ localId: element.localId, className });
    }
    if (element.type === "TOTAL_ROW") {
      return ElementTotalRow({
        localId: element.localId,
        value: element.value,
        config,
        className,
      });
    }
    return [
      <ElementText
        key={element.localId}
        localId={element.localId}
        value={element.value}
        config={config}
        className={className}
      />,
    ];
  });
}
