import { Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@/components/shared/DeleteButton";

import { SummaryContent } from "./SummaryContent";

export function Summary(props) {
  const cartTranslations = useTranslations("cart");
  const { onClearCart, cartItems: items = [] } = props;

  return (
    <Card shadow="none" className="rounded-lg shadow-lg">
      <CardHeader>
        <div className="flex w-full items-center justify-between">
          <h2 className="text-lg font-semibold text-green-900">
            {cartTranslations("summary.title")}
          </h2>
          {items.length > 0 && (
          <DeleteButton onPress={onClearCart}>
            {cartTranslations("summary.clearCart")}
          </DeleteButton>
          )}
        </div>
      </CardHeader>
      <CardBody>
        <SummaryContent {...props} />
      </CardBody>
    </Card>
  );
}
