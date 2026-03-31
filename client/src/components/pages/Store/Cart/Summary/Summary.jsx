import { Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { SummaryContent } from "./SummaryContent";

export function Summary(props) {
  const t = useTranslations("cart");

  return (
    <Card shadow="none" className="rounded-lg shadow-lg">
      <CardHeader>
        <h2 className="text-lg font-semibold text-green-900">
          {t("summary.title")}
        </h2>
      </CardHeader>
      <CardBody>
        <SummaryContent {...props} />
      </CardBody>
    </Card>
  );
}
