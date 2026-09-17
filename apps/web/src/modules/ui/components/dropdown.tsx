"use client";

import { Check, ChevronDown } from "lucide-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import type { ButtonSize, ButtonVariant } from "./button";

export type DropdownSize = ButtonSize;
export type DropdownVariant = ButtonVariant;

export const dropdownSizeClasses: Record<DropdownSize, string> = {
  sm: "min-h-9 h-9 px-3 text-xs",
  md: "min-h-11 h-11 px-4 text-[13px]",
  lg: "min-h-12 h-12 px-5 text-[13px]",
};

export const dropdownVariantClasses: Record<DropdownVariant, string> = {
  primary:
    "border border-ink bg-ink text-white shadow-none hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#d8ff43] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none",
  outline:
    "border border-line bg-surface text-ink shadow-none hover:border-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-55",
  ghost:
    "border border-transparent bg-transparent text-ink hover:bg-[#ecece5] disabled:cursor-not-allowed disabled:opacity-50",
  danger:
    "border border-red-600 bg-red-600 text-white shadow-none hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-55",
  lime:
    "border border-lime bg-lime text-ink font-black shadow-none hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#11130f] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none",
  "dark-outline":
    "border border-[#383b30] bg-[#1c1e18] text-white shadow-none hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-55",
};

export function getDropdownTriggerClassName({
  variant = "outline",
  size = "md",
  className = "",
  isOpen = false,
}: {
  variant?: DropdownVariant;
  size?: DropdownSize;
  className?: string;
  isOpen?: boolean;
} = {}) {
  return [
    "inline-flex items-center justify-between gap-2 rounded-lg font-bold transition select-none cursor-pointer",
    "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus",
    "disabled:pointer-events-none disabled:opacity-50",
    dropdownVariantClasses[variant],
    dropdownSizeClasses[size],
    isOpen ? "border-ink" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  close: () => void;
  size: DropdownSize;
  variant: DropdownVariant;
  menuId: string;
  triggerId: string;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown compound components must be rendered within a <Dropdown>");
  }
  return context;
}

export interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  size?: DropdownSize;
  variant?: DropdownVariant;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function Dropdown({
  children,
  size = "md",
  variant = "outline",
  isOpen: controlledIsOpen,
  onOpenChange,
  className = "",
  ...props
}: DropdownProps) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;

  const containerRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const menuId = `${baseId}-menu`;

  const setIsOpen = useCallback(
    (valueOrFn: boolean | ((prev: boolean) => boolean)) => {
      const nextOpen =
        typeof valueOrFn === "function" ? valueOrFn(isOpen) : valueOrFn;
      if (!isControlled) {
        setUncontrolledIsOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, isOpen, onOpenChange],
  );

  const close = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, close]);

  return (
    <DropdownContext.Provider
      value={{
        isOpen,
        setIsOpen,
        close,
        size,
        variant,
        menuId,
        triggerId,
      }}
    >
      <div
        ref={containerRef}
        className={`relative inline-block text-left ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export interface DropdownTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  hideChevron?: boolean;
  className?: string;
}

export function DropdownTrigger({
  children,
  hideChevron = false,
  className = "",
  disabled = false,
  ...props
}: DropdownTriggerProps) {
  const { isOpen, setIsOpen, size, variant, triggerId, menuId } =
    useDropdownContext();

  return (
    <button
      id={triggerId}
      type="button"
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-controls={isOpen ? menuId : undefined}
      disabled={disabled}
      onClick={() => setIsOpen((prev) => !prev)}
      className={getDropdownTriggerClassName({
        variant,
        size,
        className,
        isOpen,
      })}
      {...props}
    >
      <span className="flex items-center gap-2 truncate">{children}</span>
      {!hideChevron && (
        <ChevronDown
          size={size === "sm" ? 12 : 14}
          className={`shrink-0 text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180 text-ink" : ""
          }`}
        />
      )}
    </button>
  );
}

export interface DropdownMenuProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function DropdownMenu({
  children,
  align = "left",
  className = "",
  ...props
}: DropdownMenuProps) {
  const { isOpen, menuId, triggerId } = useDropdownContext();

  if (!isOpen) return null;

  return (
    <div
      id={menuId}
      role="menu"
      aria-labelledby={triggerId}
      className={`absolute z-50 mt-1.5 min-w-[180px] rounded-xl border border-line bg-surface p-1 shadow-xl animate-in fade-in-0 zoom-in-95 ${
        align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
      } ${className}`.trim()}
      {...props}
    >
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export interface DropdownItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  isSelected?: boolean;
  danger?: boolean;
  className?: string;
}

export function DropdownItem({
  children,
  icon,
  isSelected = false,
  danger = false,
  className = "",
  onClick,
  ...props
}: DropdownItemProps) {
  const { close } = useDropdownContext();

  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        onClick?.(e);
        close();
      }}
      className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition duration-150 cursor-pointer ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : isSelected
          ? "bg-paper font-bold text-ink"
          : "text-ink/80 hover:bg-paper/80 hover:text-ink"
      } ${className}`.trim()}
      {...props}
    >
      <div className="flex items-center gap-2 truncate">
        {icon && <span className="shrink-0 text-muted">{icon}</span>}
        <span className="truncate">{children}</span>
      </div>
      {isSelected && <Check size={13} className="shrink-0 text-ink ml-2" />}
    </button>
  );
}

export function DropdownSeparator({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={`-mx-1 my-1 border-t border-line/60 ${className}`.trim()}
      {...props}
    />
  );
}

export function DropdownHeader({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export interface DropdownOption<T extends string | number = string> {
  value: T;
  label: string;
  icon?: ReactNode;
  description?: string;
}

export interface SimpleDropdownProps<T extends string | number = string> {
  options: DropdownOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  placeholder?: string;
  size?: DropdownSize;
  variant?: DropdownVariant;
  align?: "left" | "right";
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  ariaLabel?: string;
}

export function SimpleDropdown<T extends string | number = string>({
  options,
  value,
  onChange,
  placeholder = "Select option",
  size = "sm",
  variant = "outline",
  align = "left",
  disabled = false,
  className = "",
  menuClassName = "",
  ariaLabel,
}: SimpleDropdownProps<T>) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Dropdown size={size} variant={variant} className={className}>
      <DropdownTrigger disabled={disabled} aria-label={ariaLabel}>
        {selectedOption ? (
          <>
            {selectedOption.icon}
            <span>{selectedOption.label}</span>
          </>
        ) : (
          <span className="text-muted">{placeholder}</span>
        )}
      </DropdownTrigger>
      <DropdownMenu align={align} className={menuClassName}>
        {options.map((opt) => (
          <DropdownItem
            key={String(opt.value)}
            icon={opt.icon}
            isSelected={opt.value === value}
            onClick={() => onChange?.(opt.value)}
          >
            {opt.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
