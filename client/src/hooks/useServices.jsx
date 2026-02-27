"use client";
import { useState, useEffect } from "react";

import { modules } from "@lib/modules";

export function useServices(moduleKey) {
  const [services, setServices] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const moduleConfig = modules[moduleKey];
        if (moduleConfig?.services) {
          const servicesModule = await moduleConfig.services();
          setServices(servicesModule);
        }
      } catch (error) {
        console.error("Error loading services:", error);
      } finally {
        setLoading(false);
      }
    };

    if (moduleKey) {
      loadServices();
    }
  }, [moduleKey]);

  return { services, loading };
}
