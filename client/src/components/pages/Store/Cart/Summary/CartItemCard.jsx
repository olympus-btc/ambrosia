import { Card, CardBody, CardHeader, Image, NumberInput } from "@heroui/react";
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { storedAssetUrl } from "@/components/utils/storedAssetUrl";

export function CartItemCard({ item, onRemove, onUpdateQuantity }) {
  const translateCart = useTranslations("cart");
  const { formatAmount } = useCurrency();
  const imageUrl = storedAssetUrl(item.imageUrl);

  return (
    <Card className="shadow-none border-1 border-green-600">
      <CardHeader>
        <div className="flex w-full items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden bg-gray-100">
              {imageUrl ? (
                <Image
                  removeWrapper
                  alt={item.name}
                  src={imageUrl}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div data-testid={`summary-image-placeholder-${item.id}`}>
                  <ImageIcon aria-hidden="true" className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-col">
              <h3 className="text-sm font-medium text-green-900">{item.name}</h3>
              <div className="text-xs text-gray-700">
                {formatAmount(item.price)} {translateCart("summary.each")}
              </div>
            </div>
          </div>
          <DeleteButton onPress={onRemove} />
        </div>
      </CardHeader>
      <CardBody>
        <div className="flex items-center justify-between">
          <NumberInput
            className="w-1/2"
            label={translateCart("summary.quantity")}
            minValue={1}
            size="sm"
            placeholder="Enter the amount"
            value={item.quantity}
            onChange={(value) => onUpdateQuantity(item.id, Number(value))}
          />
          <div className="text-sm font-semibold text-green-900">
            {formatAmount(item.subtotal)}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
