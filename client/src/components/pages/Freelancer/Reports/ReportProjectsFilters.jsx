"use client";
import { Input, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

const ALL_OPTIONS_KEY = "all";

function toFilterValue(selectedKeys) {
  const [selectedKey = ALL_OPTIONS_KEY] = selectedKeys;
  return selectedKey === ALL_OPTIONS_KEY ? "" : selectedKey;
}

export function ReportProjectsFilters({ reportFilters, clients, projects, onReportFiltersChange, disabled }) {
  const reportTranslations = useTranslations("freelanceReports");
  const clientProjects = reportFilters.clientId
    ? projects.filter((project) => project.clientId === reportFilters.clientId)
    : projects;

  const handleClientSelection = (selectedKeys) => {
    const selectedClientId = toFilterValue(selectedKeys);
    const selectedProject = projects.find((project) => project.id === reportFilters.projectId);
    const keepsSelectedProject = !selectedClientId || selectedProject?.clientId === selectedClientId;
    onReportFiltersChange({ clientId: selectedClientId, projectId: keepsSelectedProject ? reportFilters.projectId : "" });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Input
        isClearable
        className="flex-1"
        label={reportTranslations("filters.search")}
        aria-label={reportTranslations("filters.search")}
        placeholder={reportTranslations("filters.searchPlaceholder")}
        value={reportFilters.search}
        onChange={(changeEvent) => onReportFiltersChange({ search: changeEvent.target.value })}
        onClear={() => onReportFiltersChange({ search: "" })}
        isDisabled={disabled}
      />
      <Select
        aria-label={reportTranslations("filters.client")}
        label={reportTranslations("filters.client")}
        className="sm:w-48 shrink-0"
        selectedKeys={new Set([reportFilters.clientId || ALL_OPTIONS_KEY])}
        onSelectionChange={handleClientSelection}
        isDisabled={disabled}
      >
        {[{ id: ALL_OPTIONS_KEY, name: reportTranslations("filters.allClients") }, ...clients].map((client) => (
          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
        ))}
      </Select>
      <Select
        aria-label={reportTranslations("filters.project")}
        label={reportTranslations("filters.project")}
        className="sm:w-48 shrink-0"
        selectedKeys={new Set([reportFilters.projectId || ALL_OPTIONS_KEY])}
        onSelectionChange={(selectedKeys) => onReportFiltersChange({ projectId: toFilterValue(selectedKeys) })}
        isDisabled={disabled}
      >
        {[{ id: ALL_OPTIONS_KEY, name: reportTranslations("filters.allProjects") }, ...clientProjects].map((project) => (
          <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
        ))}
      </Select>
    </div>
  );
}
