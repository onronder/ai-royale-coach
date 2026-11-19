// Local-only visual harness, excluded from the production entry.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiMetricsDashboard } from '../../../src/components/admin/ApiMetricsDashboard'
import '../../../src/i18n'
import '../../../src/index.css'
document.documentElement.classList.add('dark')
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><main className="p-4 max-w-7xl mx-auto"><ApiMetricsDashboard /></main></QueryClientProvider>)
