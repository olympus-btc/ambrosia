"use client";

import { Card, CardBody } from "@heroui/react";
import { Users } from "lucide-react";

export function ReportProjectsCard({ projectRow, taskRows }) {
  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="font-bold text-deep">{projectRow.projectName}</p>
          <p className="text-sm font-bold text-green-700">{projectRow.amount}</p>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex min-w-0 items-center gap-1 text-sm text-forest">
            <Users aria-hidden="true" className="w-3 h-3 shrink-0" />
            <span className="truncate">{projectRow.clientName}</span>
          </div>
          <span className="shrink-0 text-xs text-gray-500">{projectRow.duration}</span>
        </div>
        <div className="mt-2 divide-y divide-gray-100 border-t border-gray-100">
          {taskRows.map((taskRow) => (
            <div key={taskRow.rowKey} className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <span className="min-w-0 truncate text-gray-700">{taskRow.taskName}</span>
              <span className="shrink-0 text-xs text-gray-500">{taskRow.duration} · {taskRow.amount}</span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
