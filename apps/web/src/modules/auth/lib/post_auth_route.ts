export function getPostAuthRoute(hasOrganization: boolean): "/app" | "/onboarding" {
  return hasOrganization ? "/app" : "/onboarding";
}
