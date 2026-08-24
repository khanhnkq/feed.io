import Link from "next/link";
import * as React from "react";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "outline"
  | "ghost"
  | "danger"
  | "lime"
  | "dark-outline";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-ink bg-ink text-white shadow-none hover:-translate-y-1 hover:shadow-[5px_5px_0_#d8ff43] disabled:cursor-wait disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-none",
  outline:
    "border border-line bg-surface text-ink shadow-none hover:-translate-y-1 hover:border-ink hover:shadow-[5px_5px_0_#d8ff43] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-none",
  ghost:
    "border border-transparent bg-transparent text-ink hover:bg-[#ecece5] disabled:cursor-not-allowed disabled:opacity-50",
  danger:
    "border border-[#b8471d] bg-[#b8471d] text-white shadow-none hover:-translate-y-1 hover:shadow-[5px_5px_0_#d8ff43] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-none",
  lime:
    "border border-lime bg-lime text-ink font-black shadow-none hover:-translate-y-1 hover:shadow-[5px_5px_0_#ffffff] disabled:cursor-wait disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-none",
  "dark-outline":
    "border border-[#383b30] bg-[#1c1e18] text-white shadow-none hover:-translate-y-1 hover:border-lime hover:text-lime hover:shadow-[5px_5px_0_#d8ff43] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-none",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-11 px-4 text-[13px]",
  lg: "min-h-12 px-5 text-[13px]",
};

export function getButtonClassName({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-lg font-bold transition select-none",
    "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus",
    "active:translate-y-0 active:shadow-none",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? "w-full" : "w-auto",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

interface CommonButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pending?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export type ButtonAsButton = CommonButtonProps &
  Omit<ComponentProps<"button">, keyof CommonButtonProps> & {
    href?: undefined;
  };

export type ButtonAsLink = CommonButtonProps &
  Omit<ComponentProps<typeof Link>, keyof CommonButtonProps | "href"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    pending = false,
    fullWidth = false,
    disabled = false,
    className = "",
    children,
    ...rest
  } = props;

  const isDisabled = Boolean(disabled || pending);
  const combinedClassName = getButtonClassName({
    variant,
    size,
    fullWidth,
    className,
  });

  if ("href" in props && typeof props.href === "string" && !isDisabled) {
    const linkRest = rest as Omit<
      ComponentProps<typeof Link>,
      keyof CommonButtonProps | "href"
    >;
    return (
      <Link href={props.href} className={combinedClassName} {...linkRest}>
        {children}
      </Link>
    );
  }

  const buttonRest = rest as ComponentProps<"button">;
  return (
    <button
      className={combinedClassName}
      disabled={isDisabled}
      type={buttonRest.type ?? "button"}
      {...buttonRest}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
