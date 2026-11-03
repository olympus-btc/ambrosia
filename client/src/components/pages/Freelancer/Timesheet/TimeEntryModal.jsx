"use client";
import { useRef, useState } from "react";

import {
  DatePicker,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { DurationInput } from "./DurationInput";
import { TaskSelector } from "./TaskSelector";
import { TimeEntryModalFooter } from "./TimeEntryModalFooter";
import { formatReadableDate } from "./utils/week";

export function TimeEntryModal({
  isOpen,
  isEditing,
  isReadOnly,
  isLocked,
  clientName,
  canEdit,
  timeEntryForm,
  projects,
  tasks,
  canCreateTask,
  canDelete,
  onChange,
  onSubmit,
  onDelete,
  onStartEditing,
  onCancel,
  onClose,
}) {
  const activeLocale = useLocale();
  const timesheetTranslations = useTranslations("timesheet");
  const readableEntryDate = isReadOnly && timeEntryForm.entryDate
    ? formatReadableDate(timeEntryForm.entryDate, activeLocale)
    : "";
  const modalTitle = isReadOnly
    ? timesheetTranslations("modal.titleView")
    : timesheetTranslations(isEditing ? "modal.titleEdit" : "modal.titleAdd");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const hasValidTask = Boolean(timeEntryForm.taskId) || (canCreateTask && Boolean(timeEntryForm.taskName?.trim()));
  const isFormComplete = Boolean(
    timeEntryForm.projectId && hasValidTask && timeEntryForm.entryDate && timeEntryForm.durationMinutes,
  );

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isReadOnly || isSubmittingRef.current || !isFormComplete) return;

    isSubmittingRef.current = true;
    try {
      setIsSubmitting(true);
      await onSubmit();
    } catch {
      return;
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => !nextIsOpen && onClose()}
      backdrop="blur"
      classNames={{ backdrop: "backdrop-blur-xs bg-white/10" }}
      placement="center"
    >
      <ModalContent>
        <ModalHeader className="flex flex-row items-start justify-between gap-3 pr-10">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span>{modalTitle}</span>
            {isEditing && clientName && (
              <span className="text-sm font-normal text-gray-400 [overflow-wrap:anywhere]">{clientName}</span>
            )}
          </div>
          {isLocked && (
            <span className="flex shrink-0 items-center gap-1 pt-1 text-xs font-normal text-gray-500">
              <Lock aria-hidden="true" className="w-3 h-3" />
              {timesheetTranslations("lockedEntry")}
            </span>
          )}
        </ModalHeader>
        <ModalBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Select
              label={timesheetTranslations("modal.projectLabel")}
              placeholder={timesheetTranslations("modal.projectPlaceholder")}
              isRequired={!isReadOnly}
              isDisabled={isReadOnly}
              classNames={isReadOnly ? { base: "opacity-100", trigger: "bg-transparent shadow-none px-0 rounded-none border-b border-gray-100 data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent", selectorIcon: "hidden" } : undefined}
              selectedKeys={timeEntryForm.projectId ? [timeEntryForm.projectId] : []}
              onChange={(changeEvent) => onChange(
                changeEvent.target.value ? { projectId: changeEvent.target.value } : { projectId: "", taskId: "", taskName: "" },
              )}
              description={projects.length === 0 ? timesheetTranslations("modal.noProjects") : undefined}
            >
              {projects.map((project) => (
                <SelectItem key={project.id}>{project.name}</SelectItem>
              ))}
            </Select>

            <TaskSelector
              tasks={tasks}
              taskName={timeEntryForm.taskName}
              selectedTaskId={timeEntryForm.taskId}
              onTaskChange={onChange}
              canCreateTask={canCreateTask}
              isDisabled={!timeEntryForm.projectId}
              isReadOnly={isReadOnly}
              isRequired={!isReadOnly}
            />

            <div className={isReadOnly ? "grid grid-cols-2 gap-6" : "space-y-4"}>
              {isReadOnly ? (
                <Input
                  label={timesheetTranslations("modal.dateLabel")}
                  isReadOnly
                  value={readableEntryDate}
                  classNames={{ inputWrapper: "bg-transparent shadow-none px-0 rounded-none border-b border-gray-100 data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent", input: "first-letter:uppercase" }}
                />
              ) : (
                <DatePicker
                  name="entryDate"
                  label={timesheetTranslations("modal.dateLabel")}
                  isRequired
                  showMonthAndYearPickers
                  value={timeEntryForm.entryDate ? parseDate(timeEntryForm.entryDate) : null}
                  onChange={(selectedDate) => onChange({ entryDate: selectedDate ? selectedDate.toString() : "" })}
                />
              )}

              <DurationInput
                key={isReadOnly ? "read-only-duration" : "editable-duration"}
                isReadOnly={isReadOnly}
                durationMinutes={timeEntryForm.durationMinutes}
                onDurationChange={(durationMinutes) => onChange({ durationMinutes })}
              />
            </div>

            <Textarea
              label={timesheetTranslations("modal.descriptionLabel")}
              placeholder={isReadOnly ? timesheetTranslations("modal.noDescription") : timesheetTranslations("modal.descriptionPlaceholder")}
              isReadOnly={isReadOnly}
              minRows={isReadOnly ? 1 : 3}
              classNames={isReadOnly ? { inputWrapper: "bg-transparent shadow-none px-0 rounded-none border-b border-gray-100 data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent" } : undefined}
              value={timeEntryForm.description ?? ""}
              onChange={(changeEvent) => onChange({ description: changeEvent.target.value })}
            />

            <TimeEntryModalFooter
              isReadOnly={isReadOnly}
              isEditing={isEditing}
              canEdit={canEdit}
              canDelete={canDelete}
              isFormComplete={isFormComplete}
              isSubmitting={isSubmitting}
              onStartEditing={onStartEditing}
              onDelete={onDelete}
              onCancel={onCancel}
              onClose={onClose}
            />
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
