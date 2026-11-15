"use client";

import * as React from "react";
import { Check, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { triggerHaptic } from "../native-bridge";
import { usePwaInstall } from "../use-pwa-install";
import { PwaInstallModal } from "./pwa-install-modal";

type PwaInstallButtonProps = {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showInstalledState?: boolean;
};

export function PwaInstallButton({
  className = "",
  variant = "outline",
  size = "sm",
  showInstalledState = true,
}: PwaInstallButtonProps) {
  const { isInstalled, isStandalone, canInstall, isIOS, promptInstall } = usePwaInstall();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const handleClick = async () => {
    triggerHaptic("medium");
    if (isInstalled || isStandalone) {
      setIsModalOpen(true);
      return;
    }

    if (isIOS) {
      setIsModalOpen(true);
      return;
    }

    const res = await promptInstall();
    if (res === "ios-guide" || res === "unavailable") {
      setIsModalOpen(true);
    }
  };

  if ((isInstalled || isStandalone) && !showInstalledState) {
    return null;
  }

  if (isInstalled || isStandalone) {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 ${className}`}
          title="BooKanto App is installed on this device"
        >
          <Check className="size-3.5 text-emerald-600" />
          <span>App Installed</span>
        </button>
        <PwaInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  if (!canInstall && !isIOS) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        className={`font-semibold ${className}`}
      >
        <Download className="mr-1.5 size-3.5" />
        <span>Install App</span>
      </Button>
      <PwaInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
