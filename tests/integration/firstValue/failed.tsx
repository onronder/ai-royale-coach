// Local visual acceptance only. No production entry imports this file.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SubscriptionUserContext } from '../../../src/hooks/useSubscription'
import FirstCoaching from '../../../src/pages/FirstCoaching'
import '../../../src/i18n'
import '../../../src/index.css'
if (!['127.0.0.1', 'localhost'].includes(location.hostname) || import.meta.env.VITE_SUPABASE_URL !== 'https://fixture.supabase.co') throw new Error('Local fixture only')
const uncertain = new URLSearchParams(location.search).get('uncertain') === '1'
const state = { reason:'open', enabled:true, can_start:false, can_read:true, outcome:uncertain ? 'uncertain' : 'failed',
  task:{id:'fixture-task',user_id:'fixture',player_tag:'P0LY',status:uncertain ? 'generating' : 'failed',recommendation:null} }
globalThis.fetch = async (input) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof Request ? input.url : input.href)
  if (url.origin !== 'https://fixture.supabase.co') throw new Error('External request blocked')
  if (url.pathname === '/rest/v1/rpc/get_my_first_value') return Response.json(state)
  if (url.pathname === '/rest/v1/rpc/record_first_value_step') return Response.json(null)
  throw new Error('Unexpected fixture request: ' + url.pathname)
}
const client = new QueryClient({defaultOptions:{queries:{retry:false}}})
client.setQueryData(['first-value','fixture'],state)
client.setQueryData(['subscription-status','fixture'],{hasAccess:false,subscription:null,trial:{isActive:false,hasUsedTrial:false,daysRemaining:0},accountSlots:0})
document.documentElement.classList.add('dark')
createRoot(document.getElementById('root')!).render(<MemoryRouter><QueryClientProvider client={client}><SubscriptionUserContext.Provider value="fixture"><p className="p-2 text-center bg-amber-900">LOCAL FIXTURE — no account, AI, email or payment calls</p><FirstCoaching/></SubscriptionUserContext.Provider></QueryClientProvider></MemoryRouter>)
