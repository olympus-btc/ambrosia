"use client";

import { useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useUpload } from "@components/hooks/useUpload";
import { useConfigurations } from "@providers/configurations/configurationsProvider";

import { EditStoreInfoModal } from "./EditStoreInfoModal";
import { StoreInfoCard } from "./StoreInfoCard";

export function StoreInfo() {
  const t = useTranslations("settings");
  const { config, updateConfig } = useConfigurations();
  const { upload } = useUpload();
  const [data, setData] = useState(config);
  const [showModal, setShowModal] = useState(false);

  const handleDataChange = (newData) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let logoUrl = data.businessLogoUrl;

      if (data.businessLogo instanceof File) {
        const [uploaded] = await upload([data.businessLogo]);
        logoUrl = uploaded?.url ?? uploaded?.path;
      } else if (data.businessLogoRemoved) {
        logoUrl = null;
      }

      const updatedData = {
        ...data,
        businessLogoUrl: logoUrl,
        businessLogo: undefined,
        businessLogoRemoved: undefined,
      };

      await updateConfig(updatedData);
      setData(updatedData);
      setShowModal(false);
      addToast({
        title: t("modal.updateSuccess"),
        color: "success",
      });
    } catch (error) {
      addToast({
        title: "Error",
        description: error.message,
        color: "danger",
      });
    }
  };

  return (
    <>
      <StoreInfoCard data={data} onEdit={() => setShowModal(true)} />
      <EditStoreInfoModal
        data={data}
        setData={setData}
        onChange={handleDataChange}
        onSubmit={handleSubmit}
        isOpen={showModal}
        setIsOpen={setShowModal}
      />
    </>
  );
}
