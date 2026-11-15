// Browser-safe constants for the reviews feature.
// Imported by client components, forms, and validation schemas.

export type ReviewHighlightDefinition = {
  id: string;
  label: string;
  keywords: string[];
};

export const REVIEW_HIGHLIGHTS: readonly ReviewHighlightDefinition[] = [
  {
    id: "clean",
    label: "Clean & Sanitized",
    keywords: ["clean", "linis", "malinis", "sanitized", "hygienic", "neat", "spotless", "tidy"],
  },
  {
    id: "skilled",
    label: "Skilled & Professional",
    keywords: [
      "skill",
      "skilled",
      "galing",
      "magaling",
      "professional",
      "expert",
      "pulido",
      "detailed",
      "precision",
      "quality",
      "mahusay",
    ],
  },
  {
    id: "punctual",
    label: "On Time & Fast",
    keywords: [
      "punctual",
      "on time",
      "ontime",
      "oras",
      "mabilis",
      "bilis",
      "fast",
      "prompt",
      "efficient",
      "quick",
      "no waiting",
    ],
  },
  {
    id: "friendly",
    label: "Friendly & Accommodating",
    keywords: [
      "friendly",
      "mabait",
      "accommodating",
      "bait",
      "warm",
      "pleasant",
      "respectful",
      "nice",
      "approachable",
      "kind",
    ],
  },
  {
    id: "value",
    label: "Great Value (Sulit)",
    keywords: [
      "sulit",
      "value",
      "affordable",
      "mura",
      "worth",
      "worth it",
      "presyo",
      "fair price",
      "worth every peso",
    ],
  },
  {
    id: "relaxing",
    label: "Relaxing Atmosphere",
    keywords: [
      "relaxing",
      "comfortable",
      "presko",
      "aliwalas",
      "tahimik",
      "cozy",
      "comfy",
      "chill",
      "peaceful",
    ],
  },
] as const;

export type HighlightTag = (typeof REVIEW_HIGHLIGHTS)[number]["id"];

export const REPORT_REASONS = [
  { value: "spam", label: "Spam, promotional, or irrelevant content" },
  { value: "offensive", label: "Offensive, vulgar, or abusive language" },
  { value: "fake", label: "Fake, fabricated, or mistaken shop review" },
  { value: "privacy", label: "Violates privacy or shares personal contact details" },
  { value: "other", label: "Other issue" },
] as const;

export type ReportReasonValue = (typeof REPORT_REASONS)[number]["value"];

export const REVIEW_SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "highest", label: "Highest Rating" },
  { value: "lowest", label: "Lowest Rating" },
  { value: "with_photos", label: "With Photos First" },
] as const;

export type ReviewSortOption = (typeof REVIEW_SORT_OPTIONS)[number]["value"];

export const MAX_REVIEW_PHOTOS = 5;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_REPLY_LENGTH = 2000;
export const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export const ALLOWED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
