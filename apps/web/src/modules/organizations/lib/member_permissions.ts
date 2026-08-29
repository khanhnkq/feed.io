export function canInviteMembers(role: string): boolean {
  return role === "owner" || role === "admin";
}

export function canManageMemberRole(actorRole: string, isSelf: boolean): boolean {
  return actorRole === "owner" && !isSelf;
}

export function canRemoveMember(
  actorRole: string,
  targetRole: string,
  isSelf: boolean,
): boolean {
  if (isSelf) return true;
  if (actorRole === "owner") return true;
  if (actorRole === "admin" && targetRole === "member") return true;
  return false;
}
