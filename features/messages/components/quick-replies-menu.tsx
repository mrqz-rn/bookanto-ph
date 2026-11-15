"use client";

import * as React from "react";
import { Loader2, Plus, Search, Trash2, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { createQuickReply, deleteQuickReply } from "../actions";
import type { QuickReplyItem } from "../constants";

type QuickRepliesMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  shopId?: string;
  quickReplies: QuickReplyItem[];
  canManage?: boolean;
  onSelect: (body: string) => void;
  onCustomRepliesChange?: (updated: QuickReplyItem[]) => void;
};

export function QuickRepliesMenu({
  isOpen,
  onClose,
  shopId,
  quickReplies,
  canManage = false,
  onSelect,
  onCustomRepliesChange,
}: QuickRepliesMenuProps) {
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newBody, setNewBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setIsAddingNew(false);
      setNewTitle("");
      setNewBody("");
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Derive unique categories
  const categories = [
    "All",
    ...Array.from(new Set(quickReplies.map((r) => r.category || "General"))),
  ];

  const filteredReplies = quickReplies.filter((r) => {
    if (selectedCategory !== "All" && (r.category || "General") !== selectedCategory) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchBody = r.body.toLowerCase().includes(q);
      return matchTitle || matchBody;
    }
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;

    if (!newTitle.trim() || !newBody.trim()) {
      setErrorMsg("Please fill out both title and message text.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const res = await createQuickReply({
      shopId,
      title: newTitle.trim(),
      body: newBody.trim(),
    });

    setSubmitting(false);

    if (res.ok) {
      onCustomRepliesChange?.([res.data, ...quickReplies]);
      setIsAddingNew(false);
      setNewTitle("");
      setNewBody("");
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleDelete = async (replyId: string) => {
    if (!shopId) return;
    setDeletingId(replyId);

    const res = await deleteQuickReply({
      shopId,
      id: replyId,
    });

    setDeletingId(null);

    if (res.ok) {
      onCustomRepliesChange?.(quickReplies.filter((r) => r.id !== replyId));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick replies menu"
      className="backdrop-blur-2xs fixed inset-0 z-50 flex animate-in items-end justify-center bg-black/50 fade-in sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-neutral-200 bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Zap className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Quick Replies</h2>
              <p className="text-xs text-neutral-500">Tap a response to insert into chat</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-9 rounded-full text-neutral-500 hover:bg-neutral-100"
            aria-label="Close quick replies"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Search & Add New Toggle */}
        <div className="border-b border-neutral-100 p-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search quick replies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9 text-xs sm:text-sm"
              />
            </div>

            {canManage && !isAddingNew && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddingNew(true)}
                className="h-10 shrink-0 gap-1 border-dashed text-xs text-emerald-700 hover:bg-emerald-50"
              >
                <Plus className="size-3.5" />
                <span>New</span>
              </Button>
            )}
          </div>

          {/* Categories Pill Strip */}
          <div className="mt-2.5 no-scrollbar flex space-x-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-full px-3 py-1 font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-emerald-600 font-semibold text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content list or Add New Form */}
        <div className="flex-1 overflow-y-auto p-4 sm:px-6">
          {isAddingNew ? (
            <form
              onSubmit={handleCreate}
              className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900">Add Custom Quick Reply</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingNew(false)}
                  className="h-7 text-xs text-neutral-500"
                >
                  Cancel
                </Button>
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-600">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">
                  Shortcut Title (e.g., Gate directions)
                </label>
                <Input
                  type="text"
                  maxLength={100}
                  placeholder="Short label..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">
                  Message Text
                </label>
                <Textarea
                  maxLength={1000}
                  placeholder="Enter the full canned response..."
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  rows={3}
                  className="min-h-20 bg-white text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-3 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Quick Reply"
                  )}
                </Button>
              </div>
            </form>
          ) : filteredReplies.length === 0 ? (
            <div className="py-12 text-center">
              <Zap className="mx-auto size-8 text-neutral-300" />
              <p className="mt-2 text-sm font-medium text-neutral-600">No quick replies found</p>
              <p className="mt-1 text-xs text-neutral-400">
                Try a different search query or category
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReplies.map((reply) => (
                <div
                  key={reply.id}
                  className="group relative flex items-start justify-between rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(reply.body);
                      onClose();
                    }}
                    className="min-w-0 flex-1 pr-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900 group-hover:text-emerald-800">
                        {reply.title}
                      </span>
                      {reply.isCustom && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-600">
                      {reply.body}
                    </p>
                  </button>

                  {canManage && reply.isCustom && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={deletingId === reply.id}
                      onClick={() => handleDelete(reply.id)}
                      className="size-8 shrink-0 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${reply.title}`}
                    >
                      {deletingId === reply.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-2.5 sm:px-6">
          <p className="text-center text-[11px] text-neutral-500">
            {filteredReplies.length} {filteredReplies.length === 1 ? "reply" : "replies"} available
            · Tap to insert
          </p>
        </div>
      </div>
    </div>
  );
}
