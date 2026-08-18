"use client";

import { useRef, useState } from "react";

import { addToast, Button, Input, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { resolveRoleName } from "@/components/pages/Store/Users/Roles/utils/roleTemplates";

export function EditUsersModal({ data, setData, roles, onChange, editUsersShowModal, setEditUsersShowModal, updateUser }) {
  const userTranslations = useTranslations();
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
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

  const handleSubmitEditUser = async (event) => {
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await updateUser(data);
    } catch {
      return;
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }

    addToast({ description: userTranslations("users.toasts.updateSuccess"), color: "success" });
    setData({
      userId: "",
      userName: "",
      userPin: "",
      userPhone: "",
      userEmail: "",
      userRole: "Vendedor",
    });
    setEditUsersShowModal(false);
  };

  return (
    <Modal
      isOpen={editUsersShowModal}
      onOpenChange={handleOnCloseModal}
      placement="center"
      backdrop="blur"
      shouldBlockScroll={false}
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
        body: "overflow-y-auto max-h-[65vh]",
      }}
    >
      <ModalContent>
        <ModalHeader>
          {userTranslations("users.modal.titleEdit")}
        </ModalHeader>
        <ModalBody>
          <form
            className="space-y-4"
            onSubmit={handleSubmitEditUser}
          >
            <Input
              label={userTranslations("users.modal.userNameLabel")}
              type="text"
              placeholder={userTranslations("users.modal.userNamePlaceholder")}
              isRequired
              errorMessage={userTranslations("users.modal.userNameError")}
              value={data.userName ?? ""}
              onChange={(event) => onChange({ ...data, userName: event.target.value })}
            />
            <Input
              label={userTranslations("users.modal.userEmailLabel")}
              type="email"
              placeholder={userTranslations("users.modal.userEmailPlaceholder")}
              value={data?.userEmail ?? ""}
              onChange={(event) => onChange({ ...data, userEmail: event.target.value })}
            />
            <Input
              label={userTranslations("users.modal.userPhoneLabel")}
              type="tel"
              placeholder={userTranslations("users.modal.userPhonePlaceholder")}
              maxLength={10}
              value={data.userPhone ?? ""}
              onChange={(event) => {
                const onlyNumbers = event.target.value.replace(/\D/g, "");
                onChange({ ...data, userPhone: onlyNumbers });
              }}
            />
            <Input
              label={userTranslations("users.modal.userPinLabel")}
              type={showPin ? "text" : "password"}
              placeholder={userTranslations("users.modal.userPinPlaceholder")}
              minLength={6}
              maxLength={6}
              errorMessage={userTranslations("users.modal.userPinError")}
              value={data.userPin ?? ""}
              onChange={(event) => {
                const onlyNumbers = event.target.value.replace(/\D/g, "");
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
              label={userTranslations("users.modal.userRoleLabel")}
              isRequired
              defaultSelectedKeys={[data.userRole]}
              value={data.userRole}
              onChange={(event) => onChange({ ...data, userRole: event.target.value })}
            >
              {roles.map((role) => (
                <SelectItem key={role.id}>
                  {resolveRoleName(role.role, userTranslations)}
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
                {userTranslations("users.modal.cancelButton")}
              </Button>
              <Button
                color="primary"
                className="bg-green-800"
                type="submit"
                isDisabled={!data.userRole || isSubmitting}
                isLoading={isSubmitting}
              >
                {userTranslations("users.modal.editButton")}
              </Button>
            </ModalFooter>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
