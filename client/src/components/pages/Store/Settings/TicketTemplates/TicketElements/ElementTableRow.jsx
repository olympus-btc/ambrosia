"use client";

import { sampleTicket } from "./sampleData";

export function ElementTableRow({ localId, className }) {
  return sampleTicket.items.flatMap((item, index) => [
    <div
      key={`${localId}-row-${index}`}
      className={`flex items-start justify-between gap-3 ${className}`}
    >
      <span className="truncate">{`${item.quantity}x ${item.name}`}</span>
      <span className="whitespace-nowrap">{item.price}</span>
    </div>,
    ...item.comments.map((comment, commentIndex) => (
      <div
        key={`${localId}-comment-${index}-${commentIndex}`}
        className={`ml-3 text-xs text-gray-600 ${className}`}
      >
        {`- ${comment}`}
      </div>
    )),
  ]);
}
