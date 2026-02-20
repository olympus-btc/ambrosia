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
      modules: () =>
        import(`../modules/${componentPath}/${componentFile}`).then((mod) => {
          const Comp = mod.default || mod[componentFile];
          if (!Comp)
            throw new Error(
              `DynamicModuleRenderer: component export not found for "${componentBase}/${componentPath}/${componentFile}"`,
            );
          return Comp;
        }),
      "components/pages": async () => {
        try {
          const mod = await import(
            `./pages/${componentPath}/${componentFile}`
          );
          const Comp =
            mod.default || mod[componentFile] || mod[`${componentFile}Page`];
          if (Comp) return Comp;
        } catch (error) {
          // Si no se encuentra en components/pages, intentamos buscarlo en modules/btcmap
          // como caso especial para la integración de BTC Map dentro del módulo store
          if (componentFile === "MapEmbed") {
            try {
              const btcMapMod = await import("../modules/btcmap/MapEmbed");
              return btcMapMod.default || btcMapMod.MapEmbed;
            } catch (innerError) {
              console.error("Error loading MapEmbed from modules:", innerError);
            }
          }
          console.error(error)
        }

        try {
          const modNested = await import(
            `./pages/${componentPath}/${componentFile}/${componentFile}Page`
          );
          const CompNested =
            modNested.default ||
            modNested[`${componentFile}Page`] ||
            modNested[componentFile];
          if (CompNested) return CompNested;
        } catch (error) {
          console.error(error)
          try {
            const modIndex = await import(
              `./pages/${componentPath}/${componentFile}/index`
            );
            const CompIndex =
              modIndex.default ||
              modIndex[`${componentFile}Page`] ||
              modIndex[componentFile];
            if (CompIndex) return CompIndex;
          } catch (error) { }
          console.error(error)
        }

        throw new Error(
          `DynamicModuleRenderer: could not resolve component at "${componentBase}/${componentPath}/${componentFile}". Tried flat, nested <Name>Page, and index patterns.`,
        );
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
