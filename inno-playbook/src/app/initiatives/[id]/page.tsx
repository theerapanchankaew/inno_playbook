// Server component — required to export generateStaticParams for static export
// All client logic lives in WorkspaceClient.tsx

import WorkspaceClient from './WorkspaceClient';

// Allow dynamic params beyond those returned by generateStaticParams
// (required so /initiatives/[any-real-id] works in all deployment modes)
export const dynamicParams = true;

// Required for `output: 'export'` with dynamic routes.
// Returns a placeholder so Next.js generates the JS bundle for this route.
// Real initiative IDs are loaded at runtime by Firebase on the client.
export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function InitiativeWorkspacePage() {
  return <WorkspaceClient />;
}
