"use client";

import { useState } from "react";

import { addToast, Button, Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionBlockedMessage } from "@/components/shared/PermissionBlockedMessage";
import { RequirePermission } from "@/hooks/usePermission";

import {
  useFreelanceClients,
  useFreelanceProjects,
} from "../hooks";
import { DeleteProjectModal } from "./DeleteProjectModal";
import { ProjectFormModal } from "./ProjectFormModal";
import { ProjectsList } from "./ProjectsList";

const EMPTY_PROJECT_FORM = {
  id: "",
  clientId: "",
  name: "",
  status: "pending",
  hourlyRateCents: null,
  isBillable: true,
};

function toProjectRequest(projectForm) {
  return {
    name: projectForm.name.trim(),
    status: projectForm.status,
    hourlyRateCents: projectForm.hourlyRateCents,
    isBillable: projectForm.isBillable,
  };
}

export function Projects() {
  const projectTranslations = useTranslations("freelanceProjects");
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT_FORM);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [formMode, setFormMode] = useState("add");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const {
    projects,
    loading: projectsLoading,
    forbidden: projectsForbidden,
    createFreelanceProject,
    updateFreelanceProject,
    deleteFreelanceProject,
  } = useFreelanceProjects({ skipForbiddenRedirect: true });
  const {
    clients,
    loading: clientsLoading,
    forbidden: clientsForbidden,
  } = useFreelanceClients({ skipForbiddenRedirect: true });

  const handleProjectFormChange = (projectFormUpdates) => {
    setProjectForm((previousProjectForm) => ({ ...previousProjectForm, ...projectFormUpdates }));
  };

  const openAddProjectModal = () => {
    setProjectForm({
      ...EMPTY_PROJECT_FORM,
      clientId: clients[0]?.id || "",
    });
    setFormMode("add");
    setIsFormModalOpen(true);
  };

  const openEditProjectModal = (project) => {
    setProjectForm({
      id: project.id,
      clientId: project.clientId ?? "",
      name: project.name ?? "",
      status: project.status ?? "pending",
      hourlyRateCents: project.hourlyRateCents ?? null,
      isBillable: project.isBillable ?? true,
    });
    setFormMode("edit");
    setIsFormModalOpen(true);
  };

  const openDeleteProjectModal = (project) => {
    setProjectToDelete(project);
    setIsDeleteModalOpen(true);
  };

  const handleSubmitProject = async (submittedProjectForm) => {
    try {
      if (formMode === "edit") {
        await updateFreelanceProject(submittedProjectForm.id, toProjectRequest(submittedProjectForm));
        addToast({ description: projectTranslations("toasts.updateSuccess"), color: "success" });
        return;
      }

      await createFreelanceProject(submittedProjectForm.clientId, toProjectRequest(submittedProjectForm));
      addToast({ description: projectTranslations("toasts.createSuccess"), color: "success" });
    } catch (projectMutationError) {
      addToast({
        title: projectTranslations("toasts.saveErrorTitle"),
        description: projectTranslations("toasts.saveErrorDescription"),
        color: "danger",
      });
      throw projectMutationError;
    }
  };

  const handleConfirmDeleteProject = async () => {
    try {
      if (projectToDelete?.id) {
        await deleteFreelanceProject(projectToDelete.id);
        addToast({ description: projectTranslations("toasts.deleteSuccess"), color: "success" });
      }
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    } catch (deleteProjectError) {
      addToast({
        title: projectTranslations("toasts.deleteErrorTitle"),
        description: projectTranslations("toasts.deleteErrorDescription"),
        color: "danger",
      });
      throw deleteProjectError;
    }
  };

  if (projectsForbidden) {
    return (
      <>
        <PageHeader title={projectTranslations("title")} subtitle={projectTranslations("subtitle")} />
        <PermissionBlockedMessage
          title={projectTranslations("permissionBlocked.title")}
          subtitle={projectTranslations("permissionBlocked.subtitle")}
        />
      </>
    );
  }

  const isLoading = projectsLoading || clientsLoading;
  const canCreateProject = clients.length > 0 && !clientsForbidden;

  return (
    <>
      <PageHeader
        title={projectTranslations("title")}
        subtitle={projectTranslations("subtitle")}
        actions={(
          <RequirePermission allOf={["projects_create", "clients_read"]}>
            <Button
              color="primary"
              className="bg-green-800"
              onPress={openAddProjectModal}
              isDisabled={!canCreateProject}
            >
              {projectTranslations("addProject")}
            </Button>
          </RequirePermission>
        )}
      />

      <div className="bg-white rounded-lg shadow-lg p-4 lg:p-8 overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <ProjectsList
            clients={clients}
            projects={projects}
            onDeleteProject={openDeleteProjectModal}
            onEditProject={openEditProjectModal}
          />
        )}
      </div>

      <ProjectFormModal
        clients={clients}
        isOpen={isFormModalOpen}
        mode={formMode}
        onChange={handleProjectFormChange}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleSubmitProject}
        projectForm={projectForm}
      />

      <DeleteProjectModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteProject}
        project={projectToDelete}
      />
    </>
  );
}
