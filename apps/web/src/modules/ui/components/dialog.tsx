"use client";

import React, { useEffect, type MouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";

export type DialogSize = "sm" | "md" | "lg" | "xl";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: DialogSize;
  className?: string;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

export const dialogSizeClasses: Record<DialogSize, string> = {
  sm: "max-w-[400px]",
  md: "max-w-[480px]",
  lg: "max-w-[560px]",
  xl: "max-w-[680px]",
};

export function getDialogSizeClassName(size: DialogSize = "md"): string {
  return dialogSizeClasses[size] ?? dialogSizeClasses.md;
}

export function Dialog({
  isOpen,
  onClose,
  children,
  size = "md",
  className = "",
  closeOnEscape = true,
  closeOnBackdropClick = true,
  ariaLabelledBy,
  ariaDescribedBy,
}: DialogProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && closeOnEscape) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[rgb(12_13_10_/_66%)] p-4 backdrop-blur-sm md:p-6"
      role="presentation"
      onClick={handleBackdropClick}
      data-testid="dialog-backdrop"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        className={`relative w-full rounded-[14px] border border-line/60 bg-surface p-6 shadow-[0_30px_80px_rgb(0_0_0_/_30%)] md:p-8 ${getDialogSizeClassName(size)} ${className}`}
      >
        {children}
      </section>
    </div>
  );
}

export interface DialogHeaderProps {
  className?: string;
  children: ReactNode;
}

export function DialogHeader({ className = "", children }: DialogHeaderProps) {
  return <div className={`relative ${className}`}>{children}</div>;
}

export interface DialogEyebrowProps {
  className?: string;
  children: ReactNode;
}

export function DialogEyebrow({ className = "", children }: DialogEyebrowProps) {
  return (
    <p
      className={`mb-2 font-mono text-[11px] font-bold uppercase tracking-[.13em] text-muted ${className}`}
    >
      {children}
    </p>
  );
}

export interface DialogTitleProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

export function DialogTitle({ id, className = "", children }: DialogTitleProps) {
  return (
    <h2
      id={id}
      className={`m-0 text-[24px] font-bold tracking-[-.04em] text-ink md:text-[28px] ${className}`}
    >
      {children}
    </h2>
  );
}

export interface DialogDescriptionProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

export function DialogDescription({
  id,
  className = "",
  children,
}: DialogDescriptionProps) {
  return (
    <p
      id={id}
      className={`mt-1.5 text-[14px] leading-relaxed text-muted ${className}`}
    >
      {children}
    </p>
  );
}

export interface DialogCloseButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function DialogCloseButton({
  onClick,
  disabled = false,
  className = "",
  ariaLabel = "Close dialog",
}: DialogCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`absolute right-4 top-4 grid size-10 place-items-center rounded-lg border-0 bg-transparent text-muted transition-colors hover:bg-[#ecece5] hover:text-ink focus-visible:outline-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-40 ${className}`}
    >
      <X className="size-4" />
    </button>
  );
}

export interface DialogBodyProps {
  className?: string;
  children: ReactNode;
}

export function DialogBody({ className = "", children }: DialogBodyProps) {
  return <div className={`mt-5 ${className}`}>{children}</div>;
}

export interface DialogFooterProps {
  className?: string;
  children: ReactNode;
}

export function DialogFooter({ className = "", children }: DialogFooterProps) {
  return (
    <div
      className={`mt-6 flex flex-wrap items-center justify-end gap-3 pt-2 ${className}`}
    >
      {children}
    </div>
  );
}
