"use client";

import { Layers } from "lucide-react";
import React, { useState } from "react";
import {
  StoryboardAvatarsSection,
  StoryboardButtonsSection,
  StoryboardCardsSection,
  StoryboardDialogSection,
  StoryboardTablesSection,
} from "./components/components_section";
import { StoryboardMediaSection } from "./components/media_section";
import { StoryboardKanbanSection } from "./components/kanban_section";
import { StoryboardPopupSection } from "./components/popup_section";
import { StoryboardPrimitivesSection } from "./components/primitives_section";
import { StoryboardReviewSection } from "./components/review_section";

export default function StoryboardPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All Components" },
    { id: "kanban", label: "Media Review Kanban" },
    { id: "review", label: "Review & Annotations" },
    { id: "primitives", label: "Primitives (Timecode, Badges)" },
    { id: "media", label: "Media & Video Pipeline" },
    { id: "popups", label: "Floating Popups & Toasts" },
    { id: "buttons", label: "Buttons" },
    { id: "cards", label: "Cards & Surfaces" },
    { id: "dialogs", label: "Dialogs & Modals" },
    { id: "tables", label: "Tables & Filters" },
    { id: "avatars", label: "Avatars" },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink p-6 md:p-12 selection:bg-lime selection:text-ink">
      {/* Top Header Banner */}
      <header className="mb-10 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="grid size-7 place-items-center rounded-lg bg-lime font-mono text-xs font-bold text-ink border border-ink/20">
                <Layers size={16} />
              </span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted">
                Design System • Feed.io UI
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
              UI Storyboard & Component Gallery
            </h1>
            <p className="mt-1 text-sm text-muted">
              Interactive preview and verification gallery for all Feed.io UI components.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-line bg-surface px-3 py-1.5 font-mono text-xs font-semibold text-ink shadow-[2px_2px_0_#11130f]">
              v1.2 Neo-Brutalist
            </span>
          </div>
        </div>

        {/* Category Navigation */}
        <nav className="flex flex-wrap items-center gap-2 pt-4" aria-label="Component categories">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-bold transition ${
                activeCategory === cat.id
                  ? "border border-ink bg-lime text-ink shadow-[2px_2px_0_#11130f]"
                  : "border border-line bg-surface/50 text-muted hover:border-ink hover:bg-surface hover:text-ink"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto space-y-16">
        {/* Media Review Kanban Board Section */}
        {(activeCategory === "all" || activeCategory === "kanban") && (
          <StoryboardKanbanSection />
        )}

        {/* Review & Annotations Section */}
        {(activeCategory === "all" || activeCategory === "review") && (
          <StoryboardReviewSection />
        )}

        {/* Primitives Section */}
        {(activeCategory === "all" || activeCategory === "primitives") && (
          <StoryboardPrimitivesSection />
        )}

        {/* Media & Video Components */}
        {(activeCategory === "all" || activeCategory === "media") && (
          <StoryboardMediaSection />
        )}

        {/* Floating Popups & Background Toasts */}
        {(activeCategory === "all" || activeCategory === "popups") && (
          <StoryboardPopupSection />
        )}

        {/* Buttons */}
        {(activeCategory === "all" || activeCategory === "buttons") && (
          <StoryboardButtonsSection />
        )}

        {/* Cards */}
        {(activeCategory === "all" || activeCategory === "cards") && (
          <StoryboardCardsSection />
        )}

        {/* Dialogs */}
        {(activeCategory === "all" || activeCategory === "dialogs") && (
          <StoryboardDialogSection />
        )}

        {/* Tables & Filters */}
        {(activeCategory === "all" || activeCategory === "tables") && (
          <StoryboardTablesSection />
        )}

        {/* Avatars */}
        {(activeCategory === "all" || activeCategory === "avatars") && (
          <StoryboardAvatarsSection />
        )}
      </main>
    </div>
  );
}
