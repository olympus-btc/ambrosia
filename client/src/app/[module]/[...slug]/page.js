import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import DynamicModuleRenderer from "@/components/DynamicModuleRenderer";
import RequireOpenTurn from "@/components/guards/RequireOpenTurn";
import { findRouteConfig, matchesBusiness } from "@/lib/modules";

export const dynamic = "force-dynamic";

export default async function ModuleSubPage({ params, searchParams }) {
  const { module, slug } = await params;
  const resolvedSearchParams = await searchParams;
  const pathname = `/${module}/${slug.join("/")}`;

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

  const extractDynamicParams = (routePath, actualPath) => {
    const routeSegments = routePath.split("/").filter(Boolean);
    const pathSegments = actualPath.split("/").filter(Boolean);
    const dynamicParams = {};

    routeSegments.forEach((segment, i) => {
      if (segment.startsWith(":")) {
        const paramName = segment.slice(1);
        dynamicParams[paramName] = pathSegments[i];
      }
    });

    return dynamicParams;
  };

  const dynamicParams = extractDynamicParams(routeConfig.route.path, pathname);

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
        params: { module, slug, ...dynamicParams },
        route: pathname,
        dynamicParams,
        searchParams: resolvedSearchParams,
      }}
    />
  );

  return routeConfig.route.requiresOpenTurn ? (
    <RequireOpenTurn>{renderer}</RequireOpenTurn>
  ) : (
    renderer
  );
}
