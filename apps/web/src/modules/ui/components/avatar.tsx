interface AvatarProps {
  initials: string;
  tone?: "dark" | "lime";
}

export function Avatar({ initials, tone = "dark" }: AvatarProps) {
  const toneClass =
    tone === "lime" ? "bg-lime text-ink" : "bg-[#252720] text-white";
  return (
    <span
      className={`grid size-[28px] shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${toneClass}`}
    >
      {initials}
    </span>
  );
}
