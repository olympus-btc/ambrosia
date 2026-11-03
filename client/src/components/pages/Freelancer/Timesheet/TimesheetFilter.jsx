"use client";
import { useState } from "react";

import { Button, Popover, PopoverContent, PopoverTrigger, Select, SelectItem } from "@heroui/react";
import { ChevronDown, ListFilter } from "lucide-react";
import { useTranslations } from "next-intl";

const ALL_OPTIONS_KEY = "__all__";

export function TimesheetFilter({ filters, clients, projects, onFiltersChange, triggerClassName }) {
  const timesheetTranslations = useTranslations("timesheet");
  const [isOpen, setIsOpen] = useState(false);
  const activeFilterCount = [filters.clientId, filters.projectId].filter(Boolean).length;
  const clientProjects = filters.clientId
    ? projects.filter((project) => project.clientId === filters.clientId)
    : projects;

  const toFilterValue = (selectedKeys) => {
    const selectedKey = Array.from(selectedKeys)[0];
    return !selectedKey || selectedKey === ALL_OPTIONS_KEY ? "" : selectedKey;
  };

  const handleClientSelection = (selectedKeys) => {
    const selectedClientId = toFilterValue(selectedKeys);
    const selectedProject = projects.find((project) => project.id === filters.projectId);
    const keepsSelectedProject = !selectedClientId || selectedProject?.clientId === selectedClientId;
    onFiltersChange({ clientId: selectedClientId, projectId: keepsSelectedProject ? filters.projectId : "" });
  };

  const handleProjectSelection = (selectedKeys) => {
    onFiltersChange({ ...filters, projectId: toFilterValue(selectedKeys) });
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement="bottom-start">
      <PopoverTrigger>
        <Button
          size="sm"
          variant="outline"
          className={triggerClassName}
          startContent={<ListFilter aria-hidden="true" className="w-4 h-4" />}
          endContent={(
            <ChevronDown
              aria-hidden="true"
              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              strokeWidth={1.5}
            />
          )}
          aria-expanded={isOpen}
        >
          {activeFilterCount > 0
            ? timesheetTranslations("filters.activeTitle", { count: activeFilterCount })
            : timesheetTranslations("filters.title")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-4 w-80">
        <div className="space-y-4 w-full">
          <div>
            <p className="text-sm font-semibold text-green-900">{timesheetTranslations("filters.title")}</p>
            <p className="text-xs text-default-500">{timesheetTranslations("filters.subtitle")}</p>
          </div>

          <Select
            label={timesheetTranslations("filters.clientLabel")}
            selectedKeys={[filters.clientId || ALL_OPTIONS_KEY]}
            onSelectionChange={handleClientSelection}
          >
            {[
              { id: ALL_OPTIONS_KEY, name: timesheetTranslations("filters.allClients") },
              ...clients,
            ].map((client) => (
              <SelectItem key={client.id}>{client.name}</SelectItem>
            ))}
          </Select>

          <Select
            label={timesheetTranslations("filters.projectLabel")}
            selectedKeys={[filters.projectId || ALL_OPTIONS_KEY]}
            onSelectionChange={handleProjectSelection}
          >
            {[
              { id: ALL_OPTIONS_KEY, name: timesheetTranslations("filters.allProjects") },
              ...clientProjects,
            ].map((project) => (
              <SelectItem key={project.id}>{project.name}</SelectItem>
            ))}
          </Select>

          {activeFilterCount > 0 && (
            <Button
              variant="bordered"
              size="sm"
              className="w-full border border-border text-foreground hover:bg-muted transition-colors"
              onPress={() => onFiltersChange({ clientId: "", projectId: "" })}
            >
              {timesheetTranslations("filters.clear")}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
