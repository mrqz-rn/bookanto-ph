"use client";

import * as React from "react";
import { ConnectivityBanner } from "./connectivity-banner";
import { PwaInstallBanner } from "./pwa-install-banner";

export function PwaRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Delay registration slightly so initial page load critical path is completely unimpeded
    const registerWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New content is available; tell worker to skip waiting
              installingWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      } catch {
        // Service worker registration error in unsupported environments
      }
    };

    if (document.readyState === "complete") {
      registerWorker();
    } else {
      window.addEventListener("load", registerWorker, { once: true });
    }
  }, []);

  return (
    <>
      <ConnectivityBanner />
      <PwaInstallBanner />
    </>
  );
}
