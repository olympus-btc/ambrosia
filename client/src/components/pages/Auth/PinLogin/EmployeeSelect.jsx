import { Avatar, Select, SelectItem } from "@heroui/react";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

export function EmployeeSelect({ employees, selectedUser, onSelect }) {
  const t = useTranslations("pinLogin");

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-deep flex items-center">
        <Users className="w-4 h-4 mr-2" />
        {t("selectLabel")}
      </label>
      <Select
        value={selectedUser}
        onChange={(e) => onSelect(e.target.value)}
        placeholder={t("selectPlaceholder")}
        variant="bordered"
        size="lg"
        aria-label={t("selectLabel")}
        classNames={{
          trigger:
            "h-12 border-2 border-mint/30 hover:border-forest data-[focus=true]:border-forest",
          label: "text-forest/70 text-base",
          value: "text-lg text-deep",
          listboxWrapper: "max-h-80",
          popoverContent: "bg-white/95 backdrop-blur-md",
        }}
        listboxProps={{
          itemClasses: {
            base: [
              "rounded-md",
              "text-default-500",
              "transition-opacity",
              "data-[hover=true]:text-foreground",
              "data-[hover=true]:bg-default-100",
              "data-[selectable=true]:focus:bg-default-50",
              "data-[pressed=true]:opacity-70",
              "data-[focus-visible=true]:ring-default-500",
            ],
          },
        }}
        renderValue={(items) => items.map((item) => {
          const employee = employees.find((emp) => emp.id === item.key);
          if (!employee) return null;

          return (
            <div key={item.key} className="flex items-center gap-3">
              <Avatar
                className="shrink-0 bg-mint text-forest font-bold"
                size="sm"
                name={employee.avatar}
              />
              <div className="flex flex-col">
                <span className="text-deep font-semibold">{employee.name}</span>
                <span className="text-forest text-sm">{employee.role}</span>
              </div>
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
                  className="shrink-0 bg-mint text-forest font-bold shadow-sm"
                  size="md"
                  name={employee.avatar}
                  fallback={employee.avatar}
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-deep text-lg">{employee.name}</span>
                  <span className="text-forest text-sm">{employee.role}</span>
                </div>
              </div>
            </SelectItem>
          ))
        ) : (
          <SelectItem key="no-employee" isDisabled textValue={t("noEmployees")}>
            {t("noEmployees")}
          </SelectItem>
        )}
      </Select>
    </div>
  );
}
