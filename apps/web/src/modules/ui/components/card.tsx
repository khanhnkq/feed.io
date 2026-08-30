"use client";

import Link from "next/link";
import React, {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";

export interface BaseCardProps {
  children?: ReactNode;
  className?: string;
  interactive?: boolean;
  disabled?: boolean;
}

type CardAsLinkProps = BaseCardProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "children" | "className"> & {
    href: string;
    as?: never;
  };

type CardAsContainerProps<T extends ElementType = "div"> = BaseCardProps &
  Omit<ComponentPropsWithoutRef<T>, "children" | "className" | "as"> & {
    href?: never;
    as?: T;
  };

export type CardProps<T extends ElementType = "div"> =
  | CardAsLinkProps
  | CardAsContainerProps<T>;

export function getCardClassName({
  interactive = false,
  disabled = false,
  className = "",
}: {
  interactive?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const base = "flex flex-col justify-between rounded-xl border p-6";
  const defaultBorder = className.includes("border-") ? "" : "border-line";
  const defaultBg = className.includes("bg-") ? "" : "bg-surface";

  if (disabled) {
    return `${base} ${defaultBorder} bg-[#f0f0ea] opacity-65 cursor-not-allowed ${className}`.trim();
  }

  const interactiveStyles = interactive
    ? "group transition hover:-translate-y-1 hover:border-ink hover:shadow-[5px_5px_0_#d8ff43] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus cursor-pointer"
    : "";

  return `${base} ${defaultBorder} ${defaultBg} ${interactiveStyles} ${className}`.trim();
}

export function Card<T extends ElementType = "div">(props: CardProps<T>) {
  const {
    children,
    className = "",
    interactive: explicitInteractive,
    disabled = false,
    ...rest
  } = props;

  if ("href" in rest && rest.href && !disabled) {
    const { href, ...linkProps } = rest as CardAsLinkProps;
    return (
      <Link
        href={href}
        className={getCardClassName({
          interactive: explicitInteractive ?? true,
          disabled: false,
          className,
        })}
        {...linkProps}
      >
        {children}
      </Link>
    );
  }

  const Component = ("as" in rest && rest.as ? rest.as : "div") as ElementType;
  const isInteractive = explicitInteractive ?? false;

  return (
    <Component
      className={getCardClassName({
        interactive: isInteractive,
        disabled,
        className,
      })}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

export function CardBadge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`grid size-10 place-items-center rounded-lg bg-lime font-mono text-xs font-bold text-ink ${className}`}
    >
      {children}
    </span>
  );
}

export function CardTitle({
  children,
  className = "",
  as: Component = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  const defaultMargin =
    className.includes("mt-") ||
    className.includes("my-") ||
    className.includes("m-")
      ? ""
      : "mt-6";
  const defaultColor = className.includes("text-")
    ? ""
    : "text-ink group-hover:text-black";
  return (
    <Component
      className={`${defaultMargin} text-xl font-bold tracking-tight ${defaultColor} ${className}`.trim()}
    >
      {children}
    </Component>
  );
}

export function CardDescription({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const defaultMargin =
    className.includes("mt-") ||
    className.includes("my-") ||
    className.includes("m-")
      ? ""
      : "mt-2";
  const defaultColor = className.includes("text-") ? "" : "text-muted";
  return (
    <p className={`${defaultMargin} text-xs leading-relaxed ${defaultColor} ${className}`.trim()}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
  bordered = true,
}: {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  const borderClass = bordered ? "mt-8 border-t border-line pt-4" : "";
  const defaultColor = className.includes("text-") ? "" : "text-ink";
  return (
    <footer
      className={`flex items-center justify-between text-xs font-bold ${defaultColor} ${borderClass} ${className}`.trim()}
    >
      {children}
    </footer>
  );
}
