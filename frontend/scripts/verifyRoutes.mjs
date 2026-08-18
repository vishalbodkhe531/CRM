import fs from "fs";
import path from "path";
import { matchRoutes } from "react-router-dom";

/**
 * Verifies URL resolution against React Router's real matcher.
 *
 * The risk in a route refactor is not whether the app compiles — it is whether
 * one pattern shadows another. `/:orgSlug/*` in particular is deliberately broad
 * (it catches every retired tenant URL), so this asserts it does NOT swallow
 * real routes like `/users/:id` or the super-admin workspace children.
 *
 * Route patterns are parsed out of AppRoutes.tsx rather than restated here, so
 * this cannot drift into testing a stale copy of the table.
 *
 * Run:  node scripts/verifyRoutes.mjs
 */

const SOURCE = path.join("src", "components", "routing", "AppRoutes.tsx");
const raw = fs.readFileSync(SOURCE, "utf8");

/**
 * Strip every `attr={...}` value, matching braces so nested JSX inside
 * `element={<Foo bar={1} />}` is removed whole.
 *
 * Without this, the `/>` that ends `element={<Users />}` reads as the end of the
 * <Route> itself, and every nested route silently becomes a top-level one — the
 * exact mistake an indentation-based parser makes here, because a multi-line
 * <Route>'s `path` sits at the same indent as its children.
 */
const stripBracedAttributes = (text) => {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const eq = text.indexOf("={", i);
    if (eq === -1) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, eq);
    let depth = 0;
    let j = eq + 1;
    for (; j < text.length; j += 1) {
      if (text[j] === "{") depth += 1;
      else if (text[j] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    i = j + 1;
  }
  return out;
};

const cleaned = stripBracedAttributes(raw);

/*
 * With braced attributes gone, the Route structure is a flat token stream:
 *   <Route path="x" />   self-closing, no children
 *   <Route path="x">     opens a block
 *   </Route>             closes it
 * A stack of absolute prefixes turns relative child paths into full patterns.
 */
const tokens = cleaned.match(/<Route[^>]*>|<\/Route>/g) ?? [];

const patterns = [];
const stack = [];

const joinPath = (parent, child) => {
  if (child.startsWith("/")) return child;
  if (!parent) return `/${child}`;
  return `${parent.replace(/\/$/, "")}/${child}`;
};

for (const token of tokens) {
  if (token === "</Route>") {
    stack.pop();
    continue;
  }

  const pathMatch = token.match(/\bpath="([^"]+)"/);
  const selfClosing = /\/>$/.test(token.trim());
  const parent = stack.length ? stack[stack.length - 1] : null;

  const full = pathMatch ? joinPath(parent, pathMatch[1]) : parent;

  if (pathMatch) patterns.push(full);
  // A pathless <Route element={<Layout/>}> still nests, so carry the parent down.
  if (!selfClosing) stack.push(full);
}

const routes = [...new Set(patterns)].map((p) => ({ path: p }));

console.log(`Parsed ${routes.length} route patterns from ${SOURCE}\n`);

const results = [];
const check = (name, passed, detail) => results.push({ name, passed, detail });

const resolvePattern = (url) => {
  const matched = matchRoutes(routes, url);
  if (!matched) return null;
  return matched[matched.length - 1].route.path;
};

const expect = (url, pattern) => {
  const got = resolvePattern(url);
  check(`${url}`.padEnd(46) + `-> ${pattern}`, got === pattern, `got ${got ?? "(no match)"}`);
};

// ---- tenant routes resolve to themselves, NOT to the legacy catch-all -------
expect("/dashboard", "/dashboard");
expect("/leads", "/leads");
expect("/leads/new", "/leads/new");
expect("/leads/abc-123", "/leads/:id");
expect("/users", "/users");
expect("/users/new", "/users/new");
expect("/users/xyz", "/users/:id");
expect("/settings", "/settings");
expect("/notifications", "/notifications");
expect("/help", "/help");
expect("/profile", "/profile");
expect("/profile/change-password", "/profile/change-password");
expect("/announcements/some-id/edit", "/announcements/:id/edit");
expect("/audit-logs", "/audit-logs");

// ---- platform routes -------------------------------------------------------
expect("/super-admin/organizations", "/super-admin/organizations");
expect("/super-admin/billing", "/super-admin/billing");
expect("/super-admin/settings", "/super-admin/settings");
expect("/super-admin/announcements", "/super-admin/announcements");
expect("/super-admin/organizations/add", "/super-admin/organizations/add");
expect("/super-admin/organizations/acme", "/super-admin/organizations/:slug");
expect("/super-admin/organizations/acme/edit", "/super-admin/organizations/:slug/edit");
expect("/super-admin/billing/plans/create", "/super-admin/billing/plans/create");
expect("/super-admin/billing/plans/p1/edit", "/super-admin/billing/plans/:id/edit");

// ---- the scoped workspace children still attach ----------------------------
expect("/super-admin/organizations/acme/users", "/super-admin/organizations/:slug/users");
expect("/super-admin/organizations/acme/users/u1", "/super-admin/organizations/:slug/users/:id");
expect("/super-admin/organizations/acme/leads/l1", "/super-admin/organizations/:slug/leads/:id");
expect("/super-admin/organizations/acme/billing", "/super-admin/organizations/:slug/billing");
expect("/super-admin/organizations/acme/reports", "/super-admin/organizations/:slug/reports");

// ---- legacy redirects ------------------------------------------------------
expect("/emvesso/leads", "/:orgSlug/*");
expect("/emvesso/dashboard", "/:orgSlug/*");
expect("/emvesso/leads/abc-123", "/:orgSlug/*");
expect("/emvesso/profile/change-password", "/:orgSlug/*");
expect("/admin/organizations", "/admin/organizations");
expect("/admin/organizations/acme", "/admin/organizations/:slug");
expect("/super-admin/announcements", "/super-admin/announcements");
expect("/super-admin/announcements/create", "/super-admin/announcements/create");
expect("/super-admin/announcements/a1/edit", "/super-admin/announcements/:id/edit");

/*
 * Announcements must exist at exactly ONE authoring path. It previously had two
 * — /announcements for admin and /super-admin/announcements for super admin —
 * rendering the same component, which is what made the prefix look arbitrary.
 * The prefixed routes survive only as redirects.
 */
const announcementPages = routes
  .map((r) => r.path)
  .filter((p) => p.includes("announcements"));
check(
  "announcements has one canonical path per view",
  announcementPages.filter((p) => !p.startsWith("/super-admin/")).length === 3,
  `canonical: ${announcementPages.filter((p) => !p.startsWith("/super-admin/")).join(", ")}`,
);

check(
  "/totally-unknown falls through to a redirect",
  ["/:orgSlug/*", "*"].includes(resolvePattern("/totally-unknown")),
  `got ${resolvePattern("/totally-unknown")}`,
);

// No tenant page may be shadowed by the legacy pattern.
const tenantPages = [
  "/dashboard", "/users", "/items", "/leads", "/quotations", "/customers",
  "/prospects", "/followups", "/reports", "/audit-logs", "/announcements",
  "/notifications", "/settings", "/help", "/profile",
];
const shadowed = tenantPages.filter((p) => resolvePattern(p) !== p);
check(
  "no tenant page is shadowed by /:orgSlug/*",
  shadowed.length === 0,
  shadowed.length ? `shadowed: ${shadowed.join(", ")}` : `${tenantPages.length} pages checked`,
);

const failures = results.filter((r) => !r.passed).length;

console.log("Route resolution\n");
for (const r of results) {
  console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.passed ? "" : `   [${r.detail}]`}`);
}
console.log(
  `\n${results.length - failures}/${results.length} passed${failures ? ` — ${failures} FAILED` : ""}\n`,
);

if (failures) process.exitCode = 1;
