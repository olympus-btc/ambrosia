import { Avatar, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

export function EmployeeSelect({ employees, selectedUser, onSelect }) {
  const t = useTranslations("pinLogin");

  return (
    <Select
      label={t("selectLabel")}
      value={selectedUser}
      onChange={(e) => onSelect(e.target.value)}
      placeholder={t("selectPlaceholder")}
      aria-label={t("selectLabel")}
      renderValue={(items) => items.map((item) => {
        const employee = employees.find((emp) => emp.id === item.key);
        if (!employee) return null;

        return (
          <div key={item.key} className="flex items-center gap-2">
            <Avatar color="primary" size="sm" name={employee.avatar} className="w-6 h-6 text-tiny shrink-0" />
            <span className="text-foreground font-semibold">{employee.name}</span>
            <span className="text-default-500 text-sm">{employee.role}</span>
          </div>
        );
      })
        }
    >
      {employees.length > 0 ? (
        employees.map((employee) => (
          <SelectItem
            key={employee.id}
            value={employee.id}
            textValue={employee.name}
            className="py-2"
          >
            <div className="flex items-center gap-4">
              <Avatar
                color="primary"
                size="md"
                name={employee.avatar}
              />
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{employee.name}</span>
                <span className="text-default-500 text-sm">{employee.role}</span>
              </div>
            </div>
          </SelectItem>
        ))
      ) : (
        <SelectItem key="no-employee" textValue={t("noEmployees")}>
          {t("noEmployees")}
        </SelectItem>
      )}
    </Select>
  );
}
