// Server component — required to export generateStaticParams for static export
// All client logic lives in WorkspaceClient.tsx

import WorkspaceClient from './WorkspaceClient';

// Required for `output: 'export'` with dynamic routes.
// Real initiative IDs are loaded at runtime by Firebase on the client.
export async function generateStaticParams() {
  return [{ id: '_' }];
}

export default function InitiativeWorkspacePage() {
  return <WorkspaceClient />;
}
