import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import DynamicModuleRenderer from "@/components/DynamicModuleRenderer";
import RequireOpenTurn from "@/components/guards/RequireOpenTurn";
import { modules, findRouteConfig, matchesBusiness } from "@lib/modules";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return Object.keys(modules)
    .filter((key) => modules[key].enabled)
    .map((module) => ({ module }));
}

export default async function ModulePage({ params }) {
  const { module } = await params;
  const pathname = `/${module}`;

  const routeConfig = findRouteConfig(pathname);
  if (!routeConfig) {
    notFound();
  }

  const cookieStore = await cookies();
  const businessType = cookieStore.get("businessType")?.value || null;
  const routePath = routeConfig?.route?.path || pathname;
  if (
    !matchesBusiness({ path: routePath, ...routeConfig.route }, businessType)
  ) {
    notFound();
  }

  const componentPath =
    routeConfig.moduleConfig.componentPath || routeConfig.module;
  const componentBase = routeConfig.moduleConfig.componentBase || "modules";

  const renderer = (
    <DynamicModuleRenderer
      componentBase={componentBase}
      componentPath={componentPath}
      componentFile={routeConfig.route.component}
      passProps={{
        moduleKey: routeConfig.module,
        moduleName: routeConfig.moduleConfig.name,
      }}
    />
  );

  return routeConfig.route.requiresOpenTurn ? (
    <RequireOpenTurn>{renderer}</RequireOpenTurn>
  ) : (
    renderer
  );
}
