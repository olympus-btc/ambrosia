"use client";

import React from "react";

import dynamic from "next/dynamic";

import LoadingCard from "./LoadingCard";

export default function DynamicModuleRenderer({
  componentBase = "modules",
  componentPath,
  componentFile,
  loadingMessage = "Cargando componente...",
  passProps = {},
}) {
  const Component = React.useMemo(() => {
    const loaderMap = {
      modules: () => import(`../modules/${componentPath}/${componentFile}`).then((mod) => {
        const Comp = mod.default || mod[componentFile];
        if (!Comp)
          throw new Error(
              `DynamicModuleRenderer: component export not found for "${componentBase}/${componentPath}/${componentFile}"`,
          );
        return Comp;
      }),
      "components/pages": async () => {
        let mod;
        try {
          mod = await import(
            `./pages/${componentPath}/${componentFile}/index`
          );
        } catch {
          mod = await import(
            `./pages/${componentPath}/${componentFile}`
          );
        }
        const Comp =
          mod.default || mod[componentFile] || mod[`${componentFile}Page`];
        if (!Comp)
          throw new Error(
            `DynamicModuleRenderer: component export not found for "${componentBase}/${componentPath}/${componentFile}"`,
          );
        return Comp;
      },
    };

    const loader = loaderMap[componentBase];
    if (!loader) {
      throw new Error(
        `DynamicModuleRenderer: unsupported componentBase "${componentBase}"`,
      );
    }

    return dynamic(loader, {
      loading: () => <LoadingCard message={loadingMessage} />,
      ssr: false,
    });
  }, [componentBase, componentPath, componentFile, loadingMessage]);

  return <Component {...passProps} />;
}
