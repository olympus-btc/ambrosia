"use client";

import { Autocomplete, AutocompleteItem, Input } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useTaskSelector } from "./hooks/useTaskSelector";

function buildTaskDescription({ timesheetTranslations, isDisabled, willCreateTask, typedTaskName }) {
  if (isDisabled) return timesheetTranslations("modal.selectProjectFirst");
  if (willCreateTask) return timesheetTranslations("modal.newTaskHint", { name: typedTaskName });
  return undefined;
}

export function TaskSelector({ tasks, taskName, selectedTaskId, onTaskChange, canCreateTask, isDisabled = false, isReadOnly = false, isRequired = true }) {
  const timesheetTranslations = useTranslations("timesheet");
  const {
    typedTaskName,
    willCreateTask,
    isUnknownTask,
    handleInputChange,
    handleSelectionChange,
  } = useTaskSelector({ tasks, taskName, onTaskChange, canCreateTask });

  if (isReadOnly) {
    return (
      <Input
        label={timesheetTranslations("modal.taskLabel")}
        isReadOnly
        value={taskName}
        classNames={{ inputWrapper: "bg-transparent shadow-none px-0 rounded-none border-b border-gray-100 data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent" }}
      />
    );
  }

  return (
    <Autocomplete
      label={timesheetTranslations("modal.taskLabel")}
      placeholder={timesheetTranslations(canCreateTask ? "modal.taskPlaceholder" : "modal.taskSelectPlaceholder")}
      isRequired={isRequired}
      allowsCustomValue
      menuTrigger="focus"
      isDisabled={isDisabled}
      description={buildTaskDescription({ timesheetTranslations, isDisabled, willCreateTask, typedTaskName })}
      isInvalid={isUnknownTask}
      errorMessage={isUnknownTask ? timesheetTranslations("modal.unknownTask") : undefined}
      inputValue={taskName}
      selectedKey={selectedTaskId || null}
      onInputChange={handleInputChange}
      onSelectionChange={handleSelectionChange}
    >
      {tasks.map((task) => (
        <AutocompleteItem key={task.id} textValue={task.name}>
          {task.name}
        </AutocompleteItem>
      ))}
    </Autocomplete>
  );
}
