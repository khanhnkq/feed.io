interface AvatarProps {
  initials: string;
  tone?: "dark" | "lime";
}

export function Avatar({ initials, tone = "dark" }: AvatarProps) {
  return <span className={`avatar avatar-${tone}`}>{initials}</span>;
}
