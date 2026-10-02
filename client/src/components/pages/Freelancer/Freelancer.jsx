"use client";

import Link from "next/link";

import { Button, Card, CardBody } from "@heroui/react";
import { Contact, FolderKanban } from "lucide-react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";
import { RequirePermission } from "@/hooks/usePermission";

const FREELANCER_WORKFLOWS = [
  {
    href: "/freelancer/clients",
    icon: Contact,
    permission: "clients_read",
    translationKey: "clients",
  },
  {
    href: "/freelancer/projects",
    icon: FolderKanban,
    permission: "projects_read",
    translationKey: "projects",
  },
];

export function Freelancer() {
  const freelancerTranslations = useTranslations("freelancerDashboard");

  return (
    <>
      <PageHeader
        title={freelancerTranslations("title")}
        subtitle={freelancerTranslations("subtitle")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FREELANCER_WORKFLOWS.map((workflow) => {
          const WorkflowIcon = workflow.icon;

          return (
            <RequirePermission key={workflow.href} allOf={[workflow.permission]}>
              <Card shadow="none" className="border border-gray-200 rounded-lg bg-white">
                <CardBody className="p-5 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <WorkflowIcon className="w-8 h-8 text-green-800 shrink-0" />
                    <div>
                      <h2 className="text-lg font-semibold text-green-900">
                        {freelancerTranslations(`${workflow.translationKey}.title`)}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {freelancerTranslations(`${workflow.translationKey}.description`)}
                      </p>
                    </div>
                  </div>
                  <Button
                    as={Link}
                    href={workflow.href}
                    color="primary"
                    className="bg-green-800 self-start"
                  >
                    {freelancerTranslations(`${workflow.translationKey}.action`)}
                  </Button>
                </CardBody>
              </Card>
            </RequirePermission>
          );
        })}
      </div>
    </>
  );
}
