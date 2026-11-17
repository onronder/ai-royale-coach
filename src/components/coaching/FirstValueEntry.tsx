import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'
import { SubscriptionUserContext } from '@/hooks/useSubscription'
import { getFirstValue } from '@/lib/firstValue'
import { SplashScreen } from '@/components/ui/splash-screen'
import { TrialExpiredPage } from '@/components/subscription/TrialExpiredPage'
import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/button'

// This boundary is used only for accounts without an existing subscription/trial.
export function FirstValueEntry({ playerTag }: { playerTag?: string | null }) {
  const {t}=useTranslation()
  const userId = useContext(SubscriptionUserContext)
  const state = useQuery({
    queryKey: ['first-value', userId],
    queryFn: getFirstValue,
    enabled: !!userId,
    retry: false,
    staleTime: 15000,
  })
  if (state.isLoading) return <SplashScreen />
  if (state.isError) return <main className="mx-auto max-w-xl space-y-4 p-6" role="alert"><p>{t('firstValue.errors.service_unavailable')}</p><Button onClick={()=>state.refetch()}>{t('firstValue.retry')}</Button></main>
  if (state.data?.reason === 'open' || state.data?.can_read)
    return (
      <Navigate
        to={playerTag ? '/first-coaching?player=' + playerTag : '/first-coaching'}
        replace
      />
    )
  return <TrialExpiredPage canStartTrial />
}
