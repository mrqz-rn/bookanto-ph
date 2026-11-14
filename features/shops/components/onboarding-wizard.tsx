"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CheckCircle2, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ONBOARDING_STEPS } from "../constants";
import { StepDetails } from "./step-details";
import { StepDocuments } from "./step-documents";
import { StepHours } from "./step-hours";
import { StepLocation } from "./step-location";
import { StepPhotos } from "./step-photos";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
};

type CityItem = {
  id: string;
  name: string;
  slug: string;
  barangays: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

type OnboardingData = {
  shop: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    address: string | null;
    cityId: string | null;
    barangayId: string | null;
    location: { lat: number; lng: number } | null;
    phone: string | null;
    status: string;
  } | null;
  categories: Array<{ categoryId: string; name: string }>;
  hours: Array<{
    weekday: number;
    opens: string;
    closes: string;
    breakStart?: string | null;
    breakEnd?: string | null;
  }>;
  photos: Array<{ id: string; path: string; sortOrder: number }>;
  documents: Array<{ id: string; path: string; sortOrder: number }>;
};

type OnboardingWizardProps = {
  initialData?: OnboardingData | null;
  availableCategories: CategoryItem[];
  availableCities: CityItem[];
};

export function OnboardingWizard({
  initialData,
  availableCategories,
  availableCities,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = React.useState<number>(() => {
    if (!initialData?.shop) return 1;
    if (!initialData.shop.address) return 2;
    if (initialData.hours.length === 0) return 3;
    if (initialData.photos.length === 0) return 4;
    return 5;
  });

  const [shopId, setShopId] = React.useState<string | undefined>(initialData?.shop?.id);
  const [shopSlug, setShopSlug] = React.useState<string | undefined>(initialData?.shop?.slug);
  const [isSubmitted, setIsSubmitted] = React.useState(
    initialData?.shop?.status === "pending" || initialData?.shop?.status === "active",
  );

  const highestStepReached = React.useRef(currentStep);
  if (currentStep > highestStepReached.current) {
    highestStepReached.current = currentStep;
  }

  if (isSubmitted) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-xs sm:p-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="size-10" />
        </div>
        <h2 className="mt-4 font-display text-2xl text-neutral-900 sm:text-3xl">
          Application Submitted!
        </h2>
        <p className="mt-2 leading-relaxed text-neutral-600">
          Salamat sa pag-register ng iyong shop sa BooKanto. We will review your documents within 24
          to 48 hours. In the meantime, you can add your services, pricing, and operating rules!
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="text-navy-950 bg-orange-600 font-bold hover:bg-orange-500"
          >
            <Link href="/dashboard/services">Set Up Services & Pricing →</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">Go to Shop Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Wizard Progress Stepper */}
      <nav aria-label="Onboarding Progress" className="mb-8">
        <ol className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
          {ONBOARDING_STEPS.map((s) => {
            const isCompleted = s.step < currentStep;
            const isCurrent = s.step === currentStep;
            const canNavigate = s.step <= highestStepReached.current && !!shopId;

            return (
              <li key={s.id} className="flex flex-1 items-center">
                <button
                  type="button"
                  disabled={!canNavigate}
                  onClick={() => canNavigate && setCurrentStep(s.step)}
                  className={`flex flex-col items-center text-center transition-all ${
                    canNavigate ? "cursor-pointer hover:opacity-80" : "cursor-default"
                  }`}
                >
                  <div
                    className={`flex size-9 items-center justify-center rounded-full text-xs font-bold transition-all sm:size-10 ${
                      isCompleted
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                          ? "bg-navy-900 text-white ring-4 ring-navy-900/15"
                          : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    {isCompleted ? <Check className="size-4.5" /> : s.step}
                  </div>
                  <span
                    className={`mt-1.5 hidden text-xs font-semibold sm:inline-block ${
                      isCurrent ? "font-bold text-navy-900" : "text-neutral-500"
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
                {s.step < ONBOARDING_STEPS.length && (
                  <div
                    className={`mx-1 h-0.5 flex-1 transition-colors ${
                      s.step < currentStep ? "bg-emerald-500" : "bg-neutral-200"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step Card Content */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs sm:p-8">
        {(() => {
          const stepDef = ONBOARDING_STEPS[currentStep - 1] ?? ONBOARDING_STEPS[0];
          return (
            <div className="mb-6 border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-orange-700 uppercase">
                <Store className="size-4" />
                <span>Step {currentStep} of 5</span>
              </div>
              <h2 className="mt-1 font-display text-2xl text-neutral-900 sm:text-3xl">
                {stepDef.title}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">{stepDef.subtitle}</p>
            </div>
          );
        })()}

        {/* Step 1: Details */}
        {currentStep === 1 && (
          <StepDetails
            shopId={shopId}
            initialName={initialData?.shop?.name}
            initialSlug={shopSlug || initialData?.shop?.slug}
            initialDescription={initialData?.shop?.description}
            initialPhone={initialData?.shop?.phone}
            initialCategoryIds={initialData?.categories.map((c) => c.categoryId)}
            categories={availableCategories}
            onComplete={(res) => {
              setShopId(res.shopId);
              setShopSlug(res.slug);
              setCurrentStep(2);
            }}
          />
        )}

        {/* Step 2: Location & Map Pin */}
        {currentStep === 2 && shopId && (
          <StepLocation
            shopId={shopId}
            initialAddress={initialData?.shop?.address}
            initialCityId={initialData?.shop?.cityId}
            initialBarangayId={initialData?.shop?.barangayId}
            initialLat={initialData?.shop?.location?.lat}
            initialLng={initialData?.shop?.location?.lng}
            cities={availableCities}
            onBack={() => setCurrentStep(1)}
            onComplete={() => setCurrentStep(3)}
          />
        )}

        {/* Step 3: Business Hours */}
        {currentStep === 3 && shopId && (
          <StepHours
            shopId={shopId}
            initialHours={initialData?.hours}
            onBack={() => setCurrentStep(2)}
            onComplete={() => setCurrentStep(4)}
          />
        )}

        {/* Step 4: Photos */}
        {currentStep === 4 && shopId && (
          <StepPhotos
            shopId={shopId}
            initialPhotos={initialData?.photos}
            onBack={() => setCurrentStep(3)}
            onComplete={() => setCurrentStep(5)}
          />
        )}

        {/* Step 5: Verification Documents */}
        {currentStep === 5 && shopId && (
          <StepDocuments
            shopId={shopId}
            initialDocuments={initialData?.documents}
            onBack={() => setCurrentStep(4)}
            onSubmitted={() => setIsSubmitted(true)}
          />
        )}
      </div>
    </div>
  );
}
