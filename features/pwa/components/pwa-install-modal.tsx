"use client";

import * as React from "react";
import Image from "next/image";
import { Bell, Check, Download, Share, Smartphone, WifiOff, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PWA_BENEFITS } from "../constants";
import { triggerHaptic } from "../native-bridge";
import { usePwaInstall } from "../use-pwa-install";

type PwaInstallModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function PwaInstallModal({ isOpen, onClose }: PwaInstallModalProps) {
  const { isInstalled, isIOS, promptInstall } = usePwaInstall();
  const [installSuccess, setInstallSuccess] = React.useState(false);

  if (!isOpen) {
    return null;
  }

  const handleInstallClick = async () => {
    triggerHaptic("medium");
    const result = await promptInstall();
    if (result === "accepted") {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs fade-in"
    >
      <div className="relative w-full max-w-md animate-in overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl zoom-in-95">
        {/* Header with App Mark */}
        <div className="relative bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 p-6 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-colors hover:bg-white/30"
          >
            <X className="size-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl border-2 border-white/30 bg-white p-1 shadow-md">
              <Image
                src="/icons/icon-192.png"
                alt="BooKanto App Icon"
                width={56}
                height={56}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-green-100 uppercase">
                Official Web App
              </span>
              <h2 id="pwa-install-title" className="font-display text-xl font-bold text-white">
                Install BooKanto
              </h2>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-green-100">
            Book local services faster, inspect today&apos;s schedule offline, and get real-time
            alerts with zero app store downloads.
          </p>
        </div>

        {/* Benefits list */}
        <div className="space-y-3 p-6">
          <div className="grid gap-2.5">
            {PWA_BENEFITS.map((benefit, idx) => {
              const Icon = idx === 0 ? Zap : idx === 1 ? WifiOff : idx === 2 ? Bell : Smartphone;
              return (
                <div
                  key={benefit.title}
                  className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/70 p-3"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900">{benefit.title}</h3>
                    <p className="text-[11px] text-neutral-600">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* iOS Instructions */}
          {isIOS && !isInstalled && (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-900">
              <div className="flex items-center gap-2 font-bold text-blue-950">
                <Share className="size-4 text-blue-600" />
                <span>How to install on iPhone & iPad:</span>
              </div>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[11px] text-blue-900">
                <li>
                  Tap the <strong className="font-semibold">Share</strong> button in Safari&apos;s
                  toolbar (the square with an arrow pointing up).
                </li>
                <li>
                  Scroll down the share sheet and select{" "}
                  <strong className="font-semibold">&quot;Add to Home Screen&quot;</strong>.
                </li>
                <li>
                  Tap <strong className="font-semibold">&quot;Add&quot;</strong> in the top-right
                  corner.
                </li>
              </ol>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex flex-col gap-2">
            {isInstalled || installSuccess ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-green-100 py-3 text-xs font-bold text-green-800">
                <Check className="size-4 text-green-700" />
                <span>BooKanto is already installed on this device!</span>
              </div>
            ) : !isIOS ? (
              <Button
                type="button"
                size="lg"
                onClick={handleInstallClick}
                className="w-full bg-green-600 font-bold text-white shadow-md hover:bg-green-500"
              >
                <Download className="mr-2 size-4" />
                Install BooKanto App Now
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                onClick={onClose}
                className="w-full bg-neutral-900 font-bold text-white hover:bg-neutral-800"
              >
                Got It
              </Button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-2 text-center text-xs font-semibold text-neutral-500 hover:text-neutral-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
