"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { triggerHaptic } from "../native-bridge";
import { usePwaInstall } from "../use-pwa-install";
import { PwaInstallModal } from "./pwa-install-modal";

export function PwaInstallBanner() {
  const pathname = usePathname();
  const { canInstall, isDismissed, isIOS, promptInstall, dismissPrompt } = usePwaInstall();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  if (pathname === "/" || !canInstall || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    triggerHaptic("medium");
    if (isIOS) {
      setIsModalOpen(true);
      return;
    }

    const res = await promptInstall();
    if (res === "ios-guide") {
      setIsModalOpen(true);
    }
  };

  const handleDismiss = () => {
    triggerHaptic("light");
    dismissPrompt(7);
  };

  return (
    <>
      <aside
        aria-label="Install app prompt"
        className="fixed right-3 bottom-3 left-3 z-40 mx-auto max-w-lg rounded-2xl border border-neutral-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md transition-all sm:right-6 sm:bottom-6 sm:left-auto sm:p-4"
      >
        <div className="flex items-start gap-3">
          <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 p-1 shadow-2xs">
            <Image
              src="/icons/icon-192.png"
              alt="BooKanto"
              width={44}
              height={44}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-xs font-bold text-neutral-900 sm:text-sm">
                Install BooKanto App
              </h3>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss install banner"
                className="flex size-6 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <p className="mt-0.5 text-[11px] leading-tight text-neutral-600 sm:text-xs">
              Instant access, offline schedule cache & real-time booking alerts.
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleInstallClick}
                className="h-8 bg-green-600 px-3 text-xs font-bold text-white shadow-xs hover:bg-green-500"
              >
                <Download className="mr-1.5 size-3.5" />
                {isIOS ? "How to Install" : "Install"}
              </Button>
              <button
                type="button"
                onClick={handleDismiss}
                className="h-8 rounded-lg px-2 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </aside>

      <PwaInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
