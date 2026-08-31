"use client";

import type { MediaResponse } from "@feedio/api-client";
import { CheckCircle2, Film, Play } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Button, FloatingPopup, FloatingPopupContainer } from "@/modules/ui";

interface TranscodingToastProps {
  mediaList: MediaResponse[];
  onPlayMedia?: (media: MediaResponse) => void;
}

export function TranscodingToast({
  mediaList,
  onPlayMedia,
}: TranscodingToastProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [completedList, setCompletedList] = useState<MediaResponse[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const prevProcessingIdsRef = useRef<Set<string>>(new Set());

  // Filter actively processing media that haven't been manually dismissed
  const processingMedia = mediaList.filter(
    (m) => m.status === "processing" && !dismissedIds.has(m.id),
  );

  // Track items that transition from 'processing' to 'ready'
  useEffect(() => {
    const currentProcessingIds = new Set(
      mediaList.filter((m) => m.status === "processing").map((m) => m.id),
    );

    for (const prevId of prevProcessingIdsRef.current) {
      if (!currentProcessingIds.has(prevId)) {
        const finishedMedia = mediaList.find((m) => m.id === prevId && m.status === "ready");
        if (finishedMedia) {
          setCompletedList((prev) => [
            ...prev.filter((item) => item.id !== finishedMedia.id),
            finishedMedia,
          ]);
          // Auto-remove completed item after 5 seconds
          setTimeout(() => {
            setCompletedList((prev) => prev.filter((item) => item.id !== finishedMedia.id));
          }, 5000);
        }
      }
    }

    prevProcessingIdsRef.current = currentProcessingIds;
  }, [mediaList]);

  const activeCount = processingMedia.length;
  const completedCount = completedList.length;

  if (activeCount === 0 && completedCount === 0) {
    return null;
  }

  return (
    <FloatingPopupContainer position="bottom-right">
      {/* Completed Success Notifications */}
      {completedList.map((media) => (
        <FloatingPopup
          key={`completed-${media.id}`}
          variant="success"
          icon={
            <span className="grid size-10 place-items-center rounded-lg bg-lime font-mono text-xs font-bold text-ink">
              <CheckCircle2 size={18} />
            </span>
          }
          eyebrow="TRANSCODE COMPLETE"
          title={media.title}
          description="HLS stream & waveforms ready"
          actions={
            onPlayMedia && (
              <Button
                size="sm"
                variant="lime"
                onClick={() => onPlayMedia(media)}
                className="gap-1.5"
              >
                <Play size={12} className="fill-ink" />
                <span>Play</span>
              </Button>
            )
          }
        />
      ))}

      {/* Active Transcoding Floating Toast Widget (Card-Style) */}
      {activeCount > 0 && (
        <FloatingPopup
          variant="surface"
          icon={
            <span className="grid size-10 place-items-center rounded-lg bg-lime font-mono text-xs font-bold text-ink">
              <Film size={18} />
            </span>
          }
          eyebrow="BACKGROUND PROCESSING"
          title={
            activeCount === 1
              ? processingMedia[0].title
              : `${activeCount} Videos Transcoding`
          }
          description="Generating HLS proxies & audio waveform"
          progress="indeterminate"
          footer={
            <>
              <span>RabbitMQ Worker</span>
              <span className="rounded border border-line bg-paper px-1.5 py-0.5 text-[10px] font-bold text-ink">
                Non-blocking
              </span>
            </>
          }
          onClose={() => {
            setDismissedIds((prev) => {
              const next = new Set(prev);
              processingMedia.forEach((m) => next.add(m.id));
              return next;
            });
          }}
          isExpanded={isExpanded}
          onToggleExpand={activeCount > 1 ? () => setIsExpanded(!isExpanded) : undefined}
          expandableContent={
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {processingMedia.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line p-2 text-xs text-ink"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Film size={14} className="shrink-0 text-muted" />
                    <span className="truncate text-xs font-mono font-medium">{m.title}</span>
                  </div>
                  {onPlayMedia && (
                    <button
                      type="button"
                      onClick={() => onPlayMedia(m)}
                      className="shrink-0 font-mono text-xs font-bold text-ink hover:underline"
                    >
                      Watch
                    </button>
                  )}
                </div>
              ))}
            </div>
          }
        />
      )}
    </FloatingPopupContainer>
  );
}
