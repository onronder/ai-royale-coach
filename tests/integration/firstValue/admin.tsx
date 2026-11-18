// Local visual harness only; Vite's production entry does not include this file.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FirstValuePanel } from '../../../src/components/admin/FirstValuePanel'
import '../../../src/i18n'
import '../../../src/index.css'
document.documentElement.classList.add('dark')
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient()}>
    <main className="mx-auto max-w-6xl p-4">
      <FirstValuePanel />
    </main>
  </QueryClientProvider>,
)
