import { CopyButton } from "@/components/shared/CopyButton";
import formatDate from "@lib/formatDate";

export function RefundInfo({ refund, refundedAtLabel, amountLabel, satsLabel, invoiceLabel, copyLabel }) {
  return (
    <div className="border-t border-purple-100 pt-3 space-y-1 text-sm">
      <p className="text-purple-700 font-medium">
        {refundedAtLabel}: {formatDate(refund.refundedAt)}
      </p>
      {refund.satoshiAmount > 0 && (
        <p className="text-gray-500 font-mono">
          {amountLabel}: {refund.satoshiAmount} {satsLabel}
        </p>
      )}
      {refund.refundInvoice && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{invoiceLabel}:</span>
          <span className="font-mono text-xs text-gray-600" title={refund.refundInvoice}>
            {refund.refundInvoice.slice(0, 16)}…
          </span>
          <CopyButton value={refund.refundInvoice} label={copyLabel} size="sm" />
        </div>
      )}
    </div>
  );
}
