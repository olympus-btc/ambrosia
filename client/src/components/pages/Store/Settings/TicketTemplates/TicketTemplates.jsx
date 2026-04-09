"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { useTemplates } from "@components/pages/Store/hooks/useTemplates";

import { TicketTemplatesModal } from "./Modal";
import { TicketTemplatesCard } from "./TicketTemplatesCard";

export function TicketTemplates() {
  const t = useTranslations("settings");
  const { templates, loading, error, refetch } = useTemplates();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleOpen = (template = null) => {
    setSelectedTemplate(template);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setSelectedTemplate(null);
    refetch();
  };

  return (
    <>
      <TicketTemplatesCard
        templates={templates}
        loading={loading}
        error={error}
        selectedId={selectedTemplate?.id || ""}
        onSelect={handleOpen}
        onNew={() => handleOpen(null)}
        t={t}
      />
      <TicketTemplatesModal
        isOpen={modalOpen}
        onClose={handleClose}
        initialTemplate={selectedTemplate}
      />
    </>
  );
}
