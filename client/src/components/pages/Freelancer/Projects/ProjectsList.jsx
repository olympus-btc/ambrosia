"use client";

import { useTranslations } from "next-intl";

import { usePermission } from "@/hooks/usePermission";

import { ProjectsCard } from "./ProjectsCard";
import { ProjectsTable } from "./ProjectsTable";

export function ProjectsList({ clients, onDeleteProject, onEditProject, projects }) {
  const projectTranslations = useTranslations("freelanceProjects");
  const canManageProjects = usePermission({ anyOf: ["projects_update", "projects_delete"] });

  if (projects.length === 0) {
    return <p className="text-center text-gray-500 py-12">{projectTranslations("emptyState")}</p>;
  }

  return (
    <section className="w-full">
      <div className="md:hidden space-y-3">
        {projects.map((project) => (
          <ProjectsCard
            key={project.id}
            clients={clients}
            project={project}
            canManageProjects={canManageProjects}
            onDeleteProject={onDeleteProject}
            onEditProject={onEditProject}
          />
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <ProjectsTable
          clients={clients}
          projects={projects}
          canManageProjects={canManageProjects}
          onDeleteProject={onDeleteProject}
          onEditProject={onEditProject}
        />
      </div>
    </section>
  );
}
