# Component Guidelines

Components should stay small, predictable, and placed where their ownership is obvious.

## Placement

| Component type | Location |
| --- | --- |
| App shell layout | `src/components/layout/*` |
| Route guards/routing helpers | `src/components/guards/*`, `src/components/routing/*` |
| Shared reusable UI | `src/components/common/*` |
| Base primitives | `src/components/ui/*` |
| One-feature UI | `src/features/<feature>/components/*` |

Large feature component folders currently use names such as `view`, `forms`, `table`, `details`, `shared`, `banner`, `usage`, and `filters`. Follow the local feature's existing structure.

## Smart And Presentational Components

- Smart feature views may call feature hooks, read auth selectors, handle routing state, and compose tables/forms.
- Presentational components receive props and render UI. They should not fetch data or know about Axios.
- `src/pages/*` files are route wrappers and should stay thin.

```tsx
const LeadsView = () => {
  const list = useListView({ filterConfig: LEAD_FILTERS });
  const { data, isLoading, isError } = useLeads(list.queryParams);

  if (isLoading) return <LoadingState label="Loading leads" />;
  if (isError) return <ErrorState message="Failed to load leads" />;

  return <LeadsTable data={data?.data ?? []} />;
};
```

## Async UI States

Every async screen should account for:

- Loading state with `LoadingState` or a feature-specific skeleton.
- Error state with `ErrorState` or `EmptyState` depending on context.
- Empty state with an action when the user can create data.
- Disabled or pending state for mutation buttons.

## Shared Components To Reuse

- `PageHeader`, `PageTabs`, `ListViewLayout`
- `DataTable`, `TableToolbar`, `TablePagination`
- `FormField`, `FormHeader`, `SubmitButton`, `PasswordInput`
- `ConfirmDialog`, `DialogShell`, `FormDialog`
- `LoadingState`, `EmptyState`, `ErrorState`, `ErrorBoundary`
- `StatusBadge`, `FollowUpHealthBadge`, `StatCard`, `FunnelChart`
- `PdfAssetUploader`, `TooltipLabel`, `ActionMenu`, `NoticeBanner`

Check `src/components/ui/*` before adding a primitive. Current primitives include button, card, checkbox, dialog, dropdown menu, input, label, popover, select, sonner, switch, table, tabs, and tooltip.

## Data Fetching Rules

- Feature hooks own API reads and writes.
- Components should not call `api.get(...)` or `api.post(...)`.
- Do not use `useEffect` plus `useState` to fetch server data.
- Mutations should report API errors in the hook with `extractApiError`.

## Forms

- Use Zod schemas from `src/contracts/validation/*` or feature validators.
- Use React Hook Form and shared field components where practical.
- Use `FormData` only when files are involved, such as lead profile pictures, organization assets, or auth profile assets.
- Keep optional-field normalization in services or utilities, not in field components.

## Styling

- Prefer existing design tokens and utility patterns in `src/index.css`.
- Keep shared components visually neutral and feature components domain-specific.
- Use existing `components/ui` primitives instead of one-off HTML controls.
- Keep table/list screens dense and scannable. This is an operational CRM, not a marketing page.
