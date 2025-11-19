"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { useUpload } from "../../components/hooks/useUpload";

export const ConfigurationsContext = createContext();

export function ConfigurationsProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { upload } = useUpload();

  const readBusinessTypeFromCookie = () => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|; )businessType=([^;]+)/);
    try {
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  };

  const businessType = useMemo(() => {
    const isValidBusinessType = (value) => value === "store" || value === "restaurant";
    return isValidBusinessType(config?.businessType)
      ? config.businessType
      : readBusinessTypeFromCookie();
  }, [config]);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient("/config", {
        skipRefresh: true,
        silentAuth: true,
      });
      setConfig(data);
    } catch (err) {
      setConfig(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const updateConfig = async (data) => {
    let logoUrl = null;
    if (data.storeImage) {
      const [uploaded] = await upload([data.storeImage]);
      logoUrl = uploaded?.url ?? uploaded?.path;
    }

    const configDataToSend = { ...data };
    delete configDataToSend.storeImage;
    delete configDataToSend.productImage;
    delete configDataToSend.businessCurrency;


    try {
      const updateConfigResponse = await apiClient(`/config`, {
        method: "PUT",
        body: {
          ...configDataToSend,
          ...(logoUrl && { businessLogoUrl: logoUrl }),
        },
      });

      await fetchConfig();
      return updateConfigResponse;
    } catch (error) {
      console.error(error)
    }
  }

  const value = {
    config,
    updateConfig,
    isLoading,
    businessType,
    refreshConfig: fetchConfig,
    setConfig,
  };

  return (
    <ConfigurationsContext.Provider value={value}>
      {children}
    </ConfigurationsContext.Provider>
  );
}

export const useConfigurations = () => useContext(ConfigurationsContext);
