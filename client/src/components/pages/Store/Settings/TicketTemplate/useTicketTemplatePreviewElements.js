"use client";

import { useMemo } from "react";

import { DEFAULT_STYLE } from "./ticketTemplateDefaults";
import { sampleConfig, sampleTicket } from "./ticketTemplateSampleData";

const fontSizeClasses = {
  NORMAL: "text-sm",
  LARGE: "text-base",
  EXTRA_LARGE: "text-lg",
};

function resolveValue(value) {
  if (!value) return "";
  return value
    .replaceAll("{{config.businessName}}", sampleConfig.businessName)
    .replaceAll("{{config.businessAddress}}", sampleConfig.businessAddress)
    .replaceAll("{{config.businessPhone}}", sampleConfig.businessPhone)
    .replaceAll("{{ticket.id}}", sampleTicket.ticketId)
    .replaceAll("{{ticket.tableName}}", sampleTicket.tableName)
    .replaceAll("{{ticket.roomName}}", sampleTicket.roomName)
    .replaceAll("{{ticket.date}}", sampleTicket.date)
    .replaceAll("{{ticket.total}}", sampleTicket.total.toString())
    .replaceAll("{{ticket.invoice}}", sampleTicket.invoice);
}

function resolveAlignment(justification) {
  if (justification === "CENTER") return "text-center";
  if (justification === "RIGHT") return "text-right";
  return "text-left";
}

export function useTicketTemplatePreviewElements(elements) {
  return useMemo(() => {
    if (!Array.isArray(elements)) return [];
    const output = [];
    elements.forEach((element) => {
      const style = element.style || DEFAULT_STYLE;
      const className = [
        resolveAlignment(style.justification),
        fontSizeClasses[style.fontSize] || fontSizeClasses.NORMAL,
        style.bold ? "font-semibold" : "font-normal",
      ].join(" ");
      if (element.type === "SEPARATOR") {
        output.push(
          <div key={`${element.localId}-sep`} className="border-t border-dashed border-gray-400 my-2" />,
        );
        return;
      }
      if (element.type === "LINE_BREAK") {
        output.push(<div key={`${element.localId}-break`} className="h-3" />);
        return;
      }
      if (element.type === "QRCODE") {
        const qrValue = resolveValue(element.value || "") || sampleTicket.invoice;
        output.push(
          <div
            key={`${element.localId}-qr`}
            className={`flex flex-col items-center gap-2 ${className}`}
          >
            <div className="flex h-28 w-28 items-center justify-center rounded-md border-2 border-dashed border-gray-400 text-xs text-gray-500">
              QR
            </div>
            <span className="text-xs text-gray-500">
              {qrValue}
            </span>
          </div>,
        );
        return;
      }
      if (element.type === "TABLE_ROW") {
        sampleTicket.items.forEach((item, index) => {
          output.push(
            <div
              key={`${element.localId}-row-${index}`}
              className={`flex items-start justify-between gap-3 ${className}`}
            >
              <span className="truncate">
                {`${item.quantity}x ${item.name}`}
              </span>
              <span className="whitespace-nowrap">
                {item.price}
              </span>
            </div>,
          );
          item.comments.forEach((comment, commentIndex) => {
            output.push(
              <div
                key={`${element.localId}-comment-${index}-${commentIndex}`}
                className={`ml-3 text-xs text-gray-600 ${className}`}
              >
                {`- ${comment}`}
              </div>,
            );
          });
        });
        return;
      }
      output.push(
        <div key={element.localId} className={className}>
          {resolveValue(element.value || "")}
        </div>,
      );
    });
    return output;
  }, [elements]);
}
