export function getPostAuthRoute(hasWorkspace: boolean): "/dashboard" | "/onboarding" {
  return hasWorkspace ? "/dashboard" : "/onboarding";
}
