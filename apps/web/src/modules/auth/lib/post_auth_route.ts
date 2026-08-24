export function getPostAuthRoute(hasOrganization: boolean): "/app" | "/onboarding" {
  return hasOrganization ? "/app" : "/onboarding";
}

export function getPostAuthRedirectUrl(
  hasOrganization: boolean,
  redirectParam?: string | null,
): string {
  if (!hasOrganization) {
    return "/onboarding";
  }

  if (
    redirectParam &&
    redirectParam.startsWith("/") &&
    !redirectParam.startsWith("//") &&
    !redirectParam.includes("://")
  ) {
    return redirectParam;
  }

  return "/app";
}
