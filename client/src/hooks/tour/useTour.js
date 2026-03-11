"use client";

import { useEffect, useRef } from "react";

import { driver } from "driver.js";

export function useTour({ key, condition = true, delay = 0, driverOptions, onBeforeStart }) {
  const driverOptionsRef = useRef(driverOptions);
  const onBeforeStartRef = useRef(onBeforeStart);

  useEffect(() => {
    driverOptionsRef.current = driverOptions;
    onBeforeStartRef.current = onBeforeStart;
  });

  useEffect(() => {
    if (!condition) return;
    if (!localStorage.getItem(key)) return;

    const timer = setTimeout(() => {
      const options = driverOptionsRef.current;
      const teardown = onBeforeStartRef.current?.();

      const driverObj = driver({
        ...options,
        onDestroyStarted: () => {
          teardown?.();
          options.onDestroyStarted?.();
          localStorage.removeItem(key);
          driverObj.destroy();
        },
      });

      driverObj.drive();
    }, delay);

    return () => clearTimeout(timer);
  }, [condition, key, delay]);
}
