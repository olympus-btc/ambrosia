"use client";

import { DEFAULT_STYLE } from "../defaults";

import { ElementLineBreak } from "./ElementLineBreak";
import { ElementLogo } from "./ElementLogo";
import { ElementPaymentMethodRow } from "./ElementPaymentMethodRow";
import { ElementQrCode } from "./ElementQrCode";
import { ElementSeparator } from "./ElementSeparator";
import { ElementShiftSummary } from "./ElementShiftSummary";
import { ElementTableRow } from "./ElementTableRow";
import { ElementText } from "./ElementText";
import { ElementTotalRow } from "./ElementTotalRow";

const ALWAYS_VISIBLE_TYPES = ["SEPARATOR", "LINE_BREAK", "TABLE_ROW", "LOGO", "SHIFT_SUMMARY"];

export function hasVisibleContent(templateElements) {
  return Array.isArray(templateElements) && templateElements.some(
    (templateElement) => ALWAYS_VISIBLE_TYPES.includes(templateElement.type) || templateElement.value?.trim(),
  );
}

const fontSizeClasses = {
  NORMAL: "text-[length:calc(100cqw/29)]",
  LARGE: "text-[length:calc(100cqw/14.5)]",
  EXTRA_LARGE: "text-[length:calc(100cqw/9.7)]",
};

function resolveAlignment(justification) {
  if (justification === "CENTER") return "text-center";
  if (justification === "RIGHT") return "text-right";
  return "text-left";
}

export function TicketElementsPreview({ templateElements, businessConfig, printFormats, sampleTicket, sampleShiftReport }) {
  if (!Array.isArray(templateElements) || templateElements.length === 0) {
    return null;
  }

  return templateElements.flatMap((templateElement) => {
    const elementStyle = templateElement.style || DEFAULT_STYLE;
    const elementClassName = [
      resolveAlignment(elementStyle.justification),
      fontSizeClasses[elementStyle.fontSize] || fontSizeClasses.NORMAL,
      elementStyle.bold ? "font-semibold" : "font-normal",
    ].join(" ");

    if (templateElement.type === "SEPARATOR") {
      return [<ElementSeparator key={`${templateElement.localId}-sep`} />];
    }
    if (templateElement.type === "LINE_BREAK") {
      return [<ElementLineBreak key={`${templateElement.localId}-break`} />];
    }
    if (templateElement.type === "QRCODE") {
      return [
        <ElementQrCode
          key={`${templateElement.localId}-qr`}
          templateText={templateElement.value}
          businessConfig={businessConfig}
          printFormats={printFormats}
          fontSize={elementStyle.fontSize}
          justification={elementStyle.justification}
          className={elementClassName}
        />,
      ];
    }
    if (templateElement.type === "LOGO") {
      return [
        <ElementLogo
          key={`${templateElement.localId}-logo`}
          templateText={templateElement.value}
          businessConfig={businessConfig}
          fontSize={elementStyle.fontSize}
          justification={elementStyle.justification}
          className={elementClassName}
        />,
      ];
    }
    if (templateElement.type === "TABLE_ROW") {
      return ElementTableRow({ localId: templateElement.localId, sampleTicket, className: elementClassName });
    }
    if (templateElement.type === "TOTAL_ROW") {
      return ElementTotalRow({
        localId: templateElement.localId,
        templateText: templateElement.value,
        businessConfig,
        printFormats,
        sampleTicket,
        className: elementClassName,
      });
    }
    if (templateElement.type === "SHIFT_SUMMARY") {
      return ElementShiftSummary({
        localId: templateElement.localId,
        templateText: templateElement.value,
        businessConfig,
        printFormats,
        sampleShiftReport,
        className: elementClassName,
      });
    }
    if (templateElement.type === "PAYMENT_METHOD") {
      return [
        <ElementPaymentMethodRow
          key={`${templateElement.localId}-payment-method`}
          templateText={templateElement.value}
          businessConfig={businessConfig}
          printFormats={printFormats}
          sampleTicket={sampleTicket}
          className={elementClassName}
        />,
      ];
    }
    return [
      <ElementText
        key={templateElement.localId}
        localId={templateElement.localId}
        templateText={templateElement.value}
        businessConfig={businessConfig}
        printFormats={printFormats}
        className={elementClassName}
      />,
    ];
  });
}
