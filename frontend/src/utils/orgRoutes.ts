const SUPER_ADMIN_ORGANIZATION_PATH_PATTERN =
  /^\/platform\/organizations\/[^/]+/;
const SUPER_ADMIN_ORGANIZATION_WORKSPACE_CREATE_PATH_PATTERN =
  /^\/platform\/organizations\/[^/]+\/(?:users|items|leads|quotations)\/new\/?$/;

/**
 * Where an authenticated user lands.
 *
 * One path for every role: /dashboard renders the role-appropriate widget, so
 * super-admin and tenant users share the URL. This was a function of the user
 * back when tenant URLs carried an organization slug prefix.
 */
export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

/**
 * Rewrites a tenant path into the super-admin organization workspace when the
 * operator is currently inside one.
 *
 * This is the one place an organization slug in the URL still earns its keep: a
 * super-admin browses many organizations, so `/platform/organizations/acme/users`
 * genuinely says which tenant is on screen. Tenant users' own URLs no longer
 * carry a slug — they only ever belong to one organization, so it identified
 * nothing.
 */
export const withSuperAdminOrganizationScope = (
  path: string,
  currentPath: string,
) => {
  if (!path.startsWith("/")) {
    return path;
  }

  const [pathWithoutQuery, query = ""] = path.split("?");
  const workspaceMatch = currentPath.match(SUPER_ADMIN_ORGANIZATION_PATH_PATTERN);

  if (!workspaceMatch) {
    return path;
  }

  return `${workspaceMatch[0]}${pathWithoutQuery}${query ? `?${query}` : ""}`;
};

export const isSuperAdminWorkspaceCreatePath = (currentPath: string) =>
  SUPER_ADMIN_ORGANIZATION_WORKSPACE_CREATE_PATH_PATTERN.test(currentPath);
