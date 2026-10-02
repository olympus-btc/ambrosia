"use client";

import { Card, CardBody, Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { RequirePermission } from "@/hooks/usePermission";

import { formatProjectHourlyRate, getProjectClientName } from "./projectFormatters";

export function ProjectsCard({ clients, canManageProjects, onDeleteProject, onEditProject, project }) {
  const projectTranslations = useTranslations("freelanceProjects");
  const projectClientName = getProjectClientName(project, clients, projectTranslations("unknownClient"));
  const projectHourlyRate = formatProjectHourlyRate(project, projectTranslations("noRateOverride"));

  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-medium text-sm truncate">{project.name}</p>
            <p className="text-xs text-gray-500">{projectClientName}</p>
            <div className="flex flex-wrap gap-2">
              <Chip size="sm" variant="flat">{projectTranslations(`statuses.${project.status}`)}</Chip>
              <Chip size="sm" variant="flat" color={project.isBillable ? "success" : "default"}>
                {project.isBillable ? projectTranslations("billable") : projectTranslations("notBillable")}
              </Chip>
            </div>
            <p className="text-xs text-gray-500">{projectHourlyRate}</p>
          </div>
          {canManageProjects && (
            <div className="flex gap-2 shrink-0">
              <RequirePermission allOf={["projects_update"]}>
                <EditButton onPress={() => onEditProject(project)} />
              </RequirePermission>
              <RequirePermission allOf={["projects_delete"]}>
                <DeleteButton onPress={() => onDeleteProject(project)} />
              </RequirePermission>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
