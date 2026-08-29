"use client";

import React, {
  type HTMLAttributes,
  type ReactNode,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { Inbox, type LucideIcon } from "lucide-react";

export interface TableContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function TableContainer({
  children,
  className = "",
  ...props
}: TableContainerProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-line bg-surface shadow-[0_2px_12px_rgba(20,21,18,0.03)] ${className}`}
      {...props}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  className?: string;
}

export function Table({ className = "", ...props }: TableProps) {
  return (
    <table
      className={`w-full text-left text-[14px] ${className}`}
      {...props}
    />
  );
}

export interface TableHeaderProps
  extends HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

export function TableHeader({ className = "", ...props }: TableHeaderProps) {
  return (
    <thead
      className={`border-b border-line bg-[#fafbf7] font-mono text-[10px] font-bold uppercase tracking-wider text-muted ${className}`}
      {...props}
    />
  );
}

export interface TableBodyProps
  extends HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

export function TableBody({ className = "", ...props }: TableBodyProps) {
  return (
    <tbody
      className={`divide-y divide-line/60 ${className}`}
      {...props}
    />
  );
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  className?: string;
  isClickable?: boolean;
}

export function TableRow({
  className = "",
  isClickable,
  ...props
}: TableRowProps) {
  return (
    <tr
      className={`transition-colors hover:bg-[#fafbf7]/80 ${isClickable ? "cursor-pointer" : ""} ${className}`}
      {...props}
    />
  );
}

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  className?: string;
}

export function TableHead({
  align = "left",
  className = "",
  ...props
}: TableHeadProps) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";
  return (
    <th
      scope="col"
      className={`px-6 py-3.5 ${alignClass} ${className}`}
      {...props}
    />
  );
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  className?: string;
}

export function TableCell({
  align = "left",
  className = "",
  ...props
}: TableCellProps) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";
  return (
    <td
      className={`px-6 py-4 ${alignClass} ${className}`}
      {...props}
    />
  );
}

export interface TableEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "standalone" | "embedded";
  colSpan?: number;
  className?: string;
}

export function TableEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  variant = "standalone",
  colSpan = 1,
  className = "",
}: TableEmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="grid size-12 place-items-center rounded-xl border border-line bg-[#f7f8f1] text-ink shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <Icon className="size-6 stroke-[1.8]" />
      </div>
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );

  if (variant === "embedded") {
    return (
      <tr>
        <td colSpan={colSpan} className={`px-6 py-16 ${className}`}>
          {content}
        </td>
      </tr>
    );
  }

  return (
    <section
      className={`rounded-xl border border-dashed border-line bg-surface/60 p-12 text-center transition md:p-14 ${className}`}
      aria-label={title}
    >
      {content}
    </section>
  );
}

export interface TableSkeletonProps {
  columnsCount?: number;
  rowsCount?: number;
}

export function TableSkeleton({
  columnsCount = 4,
  rowsCount = 3,
}: TableSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rowsCount }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {Array.from({ length: columnsCount }).map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              <div
                className={`h-4 rounded bg-[#ecece5] ${
                  colIndex === 0 ? "w-32" : colIndex === 1 ? "w-20" : "w-24"
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </TableBody>
  );
}
