"use client";

import {
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { DeleteButton } from "@/components/shared/DeleteButton";
import { EditButton } from "@/components/shared/EditButton";
import { RequirePermission } from "@/hooks/usePermission";

import { formatProjectHourlyRate, getProjectClientName } from "./projectFormatters";

export function ProjectsTable({ clients, projects, canManageProjects, onDeleteProject, onEditProject }) {
  const projectTranslations = useTranslations("freelanceProjects");

  return (
    <Table className="min-w-[820px]" removeWrapper aria-label={projectTranslations("tableAriaLabel")}>
      <TableHeader>
        <TableColumn className="py-2 px-3">{projectTranslations("name")}</TableColumn>
        <TableColumn className="py-2 px-3">{projectTranslations("client")}</TableColumn>
        <TableColumn className="py-2 px-3">{projectTranslations("status")}</TableColumn>
        <TableColumn className="py-2 px-3">{projectTranslations("rateOverride")}</TableColumn>
        <TableColumn className="py-2 px-3">{projectTranslations("billing")}</TableColumn>
        <TableColumn className={canManageProjects ? "py-2 px-3 w-40 text-right" : "hidden"}>
          {projectTranslations("actions")}
        </TableColumn>
      </TableHeader>
      <TableBody>
        {projects.map((project) => {
          const projectClientName = getProjectClientName(project, clients, projectTranslations("unknownClient"));
          const projectHourlyRate = formatProjectHourlyRate(project, projectTranslations("noRateOverride"));

          return (
            <TableRow key={project.id}>
              <TableCell className="max-w-[220px] truncate">{project.name}</TableCell>
              <TableCell>{projectClientName}</TableCell>
              <TableCell>{projectTranslations(`statuses.${project.status}`)}</TableCell>
              <TableCell>{projectHourlyRate}</TableCell>
              <TableCell>
                <Chip
                  size="sm"
                  className={
                    project.isBillable
                      ? "bg-green-200 text-xs text-green-800 border border-green-300"
                      : "bg-gray-200 text-xs text-gray-600 border border-gray-300"
                  }
                >
                  {project.isBillable ? projectTranslations("billable") : projectTranslations("notBillable")}
                </Chip>
              </TableCell>
              <TableCell className={canManageProjects ? "py-2 px-3" : "hidden"}>
                <div className="flex justify-end gap-2">
                  <RequirePermission allOf={["projects_update"]}>
                    <EditButton onPress={() => onEditProject(project)}>{projectTranslations("edit")}</EditButton>
                  </RequirePermission>
                  <RequirePermission allOf={["projects_delete"]}>
                    <DeleteButton onPress={() => onDeleteProject(project)}>{projectTranslations("delete")}</DeleteButton>
                  </RequirePermission>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
