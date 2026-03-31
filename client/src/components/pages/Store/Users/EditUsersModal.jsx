"use client";

import { useState } from "react";

import { Button, Input, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { resolveRoleName } from "@/components/pages/Store/Users/Roles/utils/roleTemplates";

export function EditUsersModal({ data, setData, roles, onChange, editUsersShowModal, setEditUsersShowModal, updateUser }) {
  const t = useTranslations();
  const [showPin, setShowPin] = useState(false);
  const handleOnCloseModal = () => {
    setData({
      userId: "",
      userName: "",
      userPin: "",
      userPhone: "",
      userEmail: "",
      userRole: roles?.[0]?.id || "",
    });

    setEditUsersShowModal(false);
  };

  return (
    <Modal
      isOpen={editUsersShowModal}
      onOpenChange={handleOnCloseModal}
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
    >
      <ModalContent>
        <ModalHeader>
          {t("users.modal.titleEdit")}
        </ModalHeader>
        <ModalBody>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setData({
                userId: "",
                userName: "",
                userPin: "",
                userPhone: "",
                userEmail: "",
                userRole: "Vendedor",
              });
              updateUser(data);
              setEditUsersShowModal(false);
            }}
          >
            <Input
              label={t("users.modal.userNameLabel")}
              type="text"
              placeholder={t("users.modal.userNamePlaceholder")}
              isRequired
              errorMessage={t("users.modal.userNameError")}
              value={data.userName ?? ""}
              onChange={(e) => onChange({ ...data, userName: e.target.value })}
            />
            <Input
              label={t("users.modal.userEmailLabel")}
              type="email"
              placeholder={t("users.modal.userEmailPlaceholder")}
              value={data?.userEmail ?? ""}
              onChange={(e) => onChange({ ...data, userEmail: e.target.value })}
            />
            <Input
              label={t("users.modal.userPhoneLabel")}
              type="tel"
              placeholder={t("users.modal.userPhonePlaceholder")}
              maxLength={10}
              value={data.userPhone ?? ""}
              onChange={(e) => {
                const onlyNumbers = e.target.value.replace(/\D/g, "");
                onChange({ ...data, userPhone: onlyNumbers });
              }}
            />
            <Input
              label={t("users.modal.userPinLabel")}
              type={showPin ? "text" : "password"}
              placeholder={t("users.modal.userPinPlaceholder")}
              minLength={4}
              maxLength={4}
              errorMessage={t("users.modal.userPinError")}
              value={data.userPin ?? ""}
              onChange={(e) => {
                const onlyNumbers = e.target.value.replace(/\D/g, "");
                onChange({ ...data, userPin: onlyNumbers });
              }}
              endContent={
                (
                  <button
                    type="button"
                    aria-label={showPin ? "Hide PIN" : "Show PIN"}
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                )
              }
            />
            <Select
              label={t("users.modal.userRoleLabel")}
              defaultSelectedKeys={[data.userRole]}
              value={data.userRole}
              onChange={(e) => onChange({ ...data, userRole: e.target.value })}
            >
              {roles.map((role) => (
                <SelectItem key={role.id}>
                  {resolveRoleName(role.role, t)}
                </SelectItem>
              ))}
            </Select>

            <ModalFooter className="flex justify-between p-0 my-4">
              <Button
                variant="bordered"
                type="button"
                className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onPress={() => handleOnCloseModal()}
              >
                {t("users.modal.cancelButton")}
              </Button>
              <Button
                color="primary"
                className="bg-green-800"
                type="submit"
              >
                {t("users.modal.editButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
