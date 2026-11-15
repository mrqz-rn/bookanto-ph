"use client";

import * as React from "react";
import { ArrowUp, Image as ImageIcon, Loader2, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_FILE_SIZE_BYTES } from "@/lib/media";

import { MAX_MESSAGE_LENGTH, type QuickReplyItem } from "../constants";
import { QuickRepliesMenu } from "./quick-replies-menu";

type ChatInputProps = {
  shopId?: string;
  isShopMember?: boolean;
  canManageQuickReplies?: boolean;
  quickReplies?: QuickReplyItem[];
  onCustomRepliesChange?: (updated: QuickReplyItem[]) => void;
  onSend: (data: { body?: string; imageBase64?: string; imageName?: string }) => Promise<boolean>;
  disabled?: boolean;
};

export function ChatInput({
  shopId,
  isShopMember = false,
  canManageQuickReplies = false,
  quickReplies = [],
  onCustomRepliesChange,
  onSend,
  disabled = false,
}: ChatInputProps) {
  const [text, setText] = React.useState("");
  const [selectedPhoto, setSelectedPhoto] = React.useState<{
    base64: string;
    previewUrl: string;
    name: string;
  } | null>(null);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError("Photo exceeds the 8 MB limit.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setValidationError("Please select a JPEG, PNG, or WebP photo.");
      return;
    }

    setValidationError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1];
      if (base64Data) {
        setSelectedPhoto({
          base64: base64Data,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
        });
      }
    };
    reader.readAsDataURL(file);

    // Reset input value so same photo can be picked again if reselected
    e.target.value = "";
  };

  const handleRemovePhoto = () => {
    if (selectedPhoto?.previewUrl) {
      URL.revokeObjectURL(selectedPhoto.previewUrl);
    }
    setSelectedPhoto(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled || isSending) return;

    const trimmed = text.trim();
    if (!trimmed && !selectedPhoto) return;

    setIsSending(true);
    setValidationError(null);

    try {
      const ok = await onSend({
        body: trimmed || undefined,
        imageBase64: selectedPhoto?.base64,
        imageName: selectedPhoto?.name,
      });

      if (ok) {
        setText("");
        handleRemovePhoto();
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectQuickReply = (cannedText: string) => {
    setText((prev) => (prev ? `${prev} ${cannedText}` : cannedText));
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const canSend = (text.trim().length > 0 || selectedPhoto !== null) && !disabled && !isSending;

  return (
    <div className="border-t border-neutral-200 bg-white p-3 sm:p-4">
      {/* Validation warning */}
      {validationError && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          <span>{validationError}</span>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="text-amber-600 hover:text-amber-800"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Selected photo preview thumbnail */}
      {selectedPhoto && (
        <div className="mb-2.5 flex items-center gap-2">
          <div className="relative size-16 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 shadow-2xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto.previewUrl}
              alt="Photo to upload"
              className="size-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/90"
              aria-label="Remove photo"
            >
              <X className="size-3" />
            </button>
          </div>
          <div className="text-xs text-neutral-500">
            <p className="max-w-[200px] truncate font-medium text-neutral-700">
              {selectedPhoto.name}
            </p>
            <p className="text-[11px]">Ready to send with message</p>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Action icons on left */}
        <div className="flex items-center gap-1 pb-1">
          {/* Photo attachment button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || isSending}
            onClick={() => fileInputRef.current?.click()}
            className="size-11 rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Attach photo"
            title="Attach photo (JPEG, PNG, WebP)"
          >
            <ImageIcon className="size-5" />
          </Button>

          {/* Quick replies button (for shops) */}
          {isShopMember && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled || isSending}
              onClick={() => setIsQuickRepliesOpen(true)}
              className="size-11 rounded-full text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
              aria-label="Quick replies"
              title="Shop quick replies"
            >
              <Zap className="size-5" />
            </Button>
          )}
        </div>

        {/* Text area */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={
              isShopMember
                ? "Reply to customer or pick a quick reply..."
                : "Type a message to the shop..."
            }
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              // Auto-expand up to 140px
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSending}
            className="field-sizing-content max-h-36 min-h-[44px] w-full resize-none rounded-2xl border border-neutral-300 bg-neutral-50/50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-50"
          />
          {text.length > 1800 && (
            <span className="absolute right-3 bottom-1 text-[10px] text-neutral-400">
              {text.length}/{MAX_MESSAGE_LENGTH}
            </span>
          )}
        </div>

        {/* Send button */}
        <div className="pb-1">
          <Button
            type="button"
            disabled={!canSend}
            onClick={() => handleSubmit()}
            size="icon"
            className="size-11 rounded-full bg-emerald-600 text-white shadow-2xs transition-transform hover:bg-emerald-700 active:scale-95 disabled:bg-neutral-200 disabled:text-neutral-400"
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ArrowUp className="size-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Quick replies modal */}
      <QuickRepliesMenu
        isOpen={isQuickRepliesOpen}
        onClose={() => setIsQuickRepliesOpen(false)}
        shopId={shopId}
        quickReplies={quickReplies}
        canManage={canManageQuickReplies}
        onSelect={handleSelectQuickReply}
        onCustomRepliesChange={onCustomRepliesChange}
      />
    </div>
  );
}
