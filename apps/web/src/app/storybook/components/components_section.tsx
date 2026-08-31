"use client";

import { Film, Sparkles } from "lucide-react";
import React, { useState } from "react";
import {
  Avatar,
  Button,
  Card,
  CardBadge,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FilterToolbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  type ViewMode,
} from "@/modules/ui";

export function StoryboardButtonsSection() {
  return (
    <section className="space-y-6">
      <div className="border-b border-line pb-3">
        <h2 className="text-xl font-bold tracking-tight text-ink">Buttons</h2>
        <p className="text-xs text-muted mt-1 font-mono">Module: `@/modules/ui/components/button`</p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-6 space-y-6">
        <div>
          <span className="font-mono text-xs font-bold text-muted uppercase block mb-3">
            Button Variants
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Action</Button>
            <Button variant="lime">Lime Highlight</Button>
            <Button variant="outline">Outline Neutral</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="danger">Danger Action</Button>
            <Button variant="dark-outline">Dark Outline</Button>
          </div>
        </div>

        <div>
          <span className="font-mono text-xs font-bold text-muted uppercase block mb-3">
            Button Sizes
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="outline">Small (sm)</Button>
            <Button size="md" variant="outline">Medium (md)</Button>
            <Button size="lg" variant="outline">Large (lg)</Button>
          </div>
        </div>

        <div>
          <span className="font-mono text-xs font-bold text-muted uppercase block mb-3">
            Interactive States
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" pending>Loading State</Button>
            <Button variant="outline" disabled>Disabled State</Button>
            <Button variant="lime">
              <Sparkles size={14} />
              <span>With Icon</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StoryboardCardsSection() {
  return (
    <section className="space-y-6">
      <div className="border-b border-line pb-3">
        <h2 className="text-xl font-bold tracking-tight text-ink">Cards & Surfaces</h2>
        <p className="text-xs text-muted mt-1 font-mono">Module: `@/modules/ui/components/card`</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardBadge>01</CardBadge>
            <span className="font-mono text-xs text-muted">Standard</span>
          </CardHeader>
          <CardTitle>Architectural Card</CardTitle>
          <CardDescription>
            Clean surface background with line borders and typography-driven layout.
          </CardDescription>
          <CardFooter bordered>
            <span>Status: Active</span>
            <span className="font-mono">Ready</span>
          </CardFooter>
        </Card>

        <Card interactive>
          <CardHeader>
            <CardBadge>02</CardBadge>
            <span className="font-mono text-xs font-bold text-focus">Hover Me</span>
          </CardHeader>
          <CardTitle>Interactive Neo-Card</CardTitle>
          <CardDescription>
            Features animated lift and Feed.io signature neon green shadow on hover.
          </CardDescription>
          <CardFooter bordered>
            <span>Interactive</span>
            <span className="font-mono text-xs font-bold">&rarr;</span>
          </CardFooter>
        </Card>

        <Card disabled>
          <CardHeader>
            <CardBadge className="bg-muted text-white">03</CardBadge>
            <span className="font-mono text-xs text-muted">Disabled</span>
          </CardHeader>
          <CardTitle>Muted Surface</CardTitle>
          <CardDescription>
            Used for archived projects or non-interactive resource displays.
          </CardDescription>
          <CardFooter bordered>
            <span>Disabled State</span>
            <span className="font-mono">Locked</span>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}

export function StoryboardDialogSection() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<"sm" | "md" | "lg" | "xl">("md");

  return (
    <section className="space-y-6">
      <div className="border-b border-line pb-3">
        <h2 className="text-xl font-bold tracking-tight text-ink">Dialogs & Modals</h2>
        <p className="text-xs text-muted mt-1 font-mono">Module: `@/modules/ui/components/dialog`</p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-6 space-y-4">
        <span className="font-mono text-xs font-bold text-muted uppercase block">
          Trigger Modal Sizes
        </span>
        <div className="flex flex-wrap gap-3">
          {(["sm", "md", "lg", "xl"] as const).map((s) => (
            <Button
              key={s}
              variant="outline"
              onClick={() => {
                setSize(s);
                setOpen(true);
              }}
            >
              Open Dialog ({s.toUpperCase()})
            </Button>
          ))}
        </div>
      </div>

      <Dialog isOpen={open} onClose={() => setOpen(false)} size={size}>
        <DialogCloseButton onClick={() => setOpen(false)} />
        <DialogHeader>
          <DialogEyebrow>DIALOG COMPONENT PREVIEW</DialogEyebrow>
          <DialogTitle>Modal Size ({size.toUpperCase()})</DialogTitle>
          <DialogDescription>
            Accessible, keyboard-navigable dialog with backdrop blur and customizable slots.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="rounded-lg border border-line bg-paper p-4 text-xs font-mono">
            Dialog content slot. Press ESC or click backdrop to close.
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setOpen(false)}>
            Confirm
          </Button>
        </DialogFooter>
      </Dialog>
    </section>
  );
}

export function StoryboardTablesSection() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState("name");

  return (
    <section className="space-y-6">
      <div className="border-b border-line pb-3">
        <h2 className="text-xl font-bold tracking-tight text-ink">Tables & Filters</h2>
        <p className="text-xs text-muted mt-1 font-mono">Modules: `@/modules/ui/components/table` & `filter_toolbar`</p>
      </div>

      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        count={2}
        itemLabelSingular="asset"
        itemLabelPlural="assets"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortOption={sortBy}
        onSortChange={setSortBy}
        sortOptions={[
          { value: "name", label: "Name" },
          { value: "created_at", label: "Date Created" },
          { value: "size", label: "File Size" },
        ]}
      />

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Resolution</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow isClickable>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded bg-paper border border-line text-ink">
                    <Film size={15} />
                  </div>
                  <span className="font-bold text-sm">pinoria-demo-cinematic-hq.mp4</span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs">video/mp4</TableCell>
              <TableCell>
                <span className="rounded border border-lime/60 bg-lime/20 px-2 py-0.5 font-mono text-[10px] font-bold text-ink">
                  Ready
                </span>
              </TableCell>
              <TableCell className="font-mono text-xs">1920x1080 (60fps)</TableCell>
              <TableCell>
                <Button size="sm" variant="ghost">View</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </section>
  );
}

export function StoryboardAvatarsSection() {
  return (
    <section className="space-y-6">
      <div className="border-b border-line pb-3">
        <h2 className="text-xl font-bold tracking-tight text-ink">Avatars & Badges</h2>
        <p className="text-xs text-muted mt-1 font-mono">Module: `@/modules/ui/components/avatar`</p>
      </div>

      <div className="rounded-xl border border-line bg-surface p-6 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <Avatar initials="NK" tone="dark" />
          <span className="text-xs font-mono">Dark Tone (<code>tone=&quot;dark&quot;</code>)</span>
        </div>

        <div className="flex items-center gap-3">
          <Avatar initials="AG" tone="lime" />
          <span className="text-xs font-mono">Lime Tone (<code>tone=&quot;lime&quot;</code>)</span>
        </div>
      </div>
    </section>
  );
}
