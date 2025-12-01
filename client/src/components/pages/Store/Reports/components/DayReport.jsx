"use client";
import { Card, CardBody, CardHeader, Divider } from "@heroui/react";
import { Calendar, Receipt, Users } from "lucide-react";
import { PaymentBadge } from "./PaymentBadge";
import { useTranslations } from "next-intl";

export function DayReport({ report, formatCurrency }) {
  const t = useTranslations("reports");
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-bold text-deep">{report.date}</h4>
          </div>
          <div className="bg-green-100 px-4 py-2 rounded-lg">
            <p className="text-lg font-bold text-green-700">
              {formatCurrency(report.balance)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-forest font-medium">{t("breakdown.totalTickets")}</span>
            <span className="font-bold text-deep">{report.tickets.length}</span>
          </div>

          <Divider />

          <div className="space-y-3">
            <h5 className="font-semibold text-deep flex items-center">
              <Receipt className="w-4 h-4 mr-2" />
              {t("breakdown.dayTicketsTitle")}
            </h5>
            {report.tickets.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {report.tickets.map((ticket, i) => (
                  <Card key={`${report.date}-${i}`} className="bg-gray-50 border">
                    <CardBody className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                        <p className="font-bold text-deep">
                          {formatCurrency(ticket.amount)}
                        </p>
                        <div className="flex items-center space-x-1 text-sm text-forest">
                          <Users className="w-3 h-3" />
                          <span>
                            {t("breakdown.by")} {ticket.userName}
                          </span>
                        </div>
                      </div>
                      <PaymentBadge method={ticket.paymentMethod} />
                    </div>
                  </CardBody>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>{t("breakdown.empty")}</p>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
