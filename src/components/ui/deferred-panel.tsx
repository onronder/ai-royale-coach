import { Suspense, useState, type ReactNode } from 'react';
import { ErrorBoundary } from './error-boundary';
import { ContentLoadStatus } from './content-load-status';
// First opening loads the code. Closing preserves the mounted panel and its draft.
export function DeferredPanel({ open, children }: { open: boolean; children: ReactNode }) {
 const [opened, setOpened] = useState(open);
 if (open && !opened) setOpened(true);
 if (!open && !opened) return null;
 return <div hidden={!open}>
  <ErrorBoundary fallback={<ContentLoadStatus failed />}>
   <Suspense fallback={<ContentLoadStatus />}>{children}</Suspense>
  </ErrorBoundary>
 </div>;
}
