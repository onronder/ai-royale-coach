import { ExternalLink, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { deckLink } from '@/lib/deckLink';
import { clashRoyaleApi } from '@/services/clashRoyaleApi';
import { isIOSDevice } from '@/types/api.types';

interface DeckTransferProps {
  cards: ReadonlyArray<{ id: number }>;
  playerTag: string;
}

export function DeckTransfer({ cards, playerTag }: DeckTransferProps) {
  const { t, i18n } = useTranslation();
  const url = deckLink(cards, i18n.resolvedLanguage ?? 'en');
  if (!url) return null;

  const openInGame = t('coaching.transfer.openInGame');
  const account = t('coaching.transfer.player', { tag: clashRoyaleApi.formatTag(playerTag) });
  const buttonClass = 'mt-3 h-auto min-h-11 w-full whitespace-normal py-2';
  const isGameDevice = isIOSDevice() || /Android/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isGameDevice) {
    return <>
      <Button asChild className={buttonClass}>
        <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden />{openInGame}</a>
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">{account}</p>
    </>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className={buttonClass}><QrCode aria-hidden />{t('coaching.transfer.openOnPhone')}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-4">{t('coaching.transfer.openOnPhone')}</DialogTitle>
          <DialogDescription>{t('coaching.transfer.scan')}</DialogDescription>
        </DialogHeader>
        <QRCodeSVG className="mx-auto h-auto max-w-full" value={url} size={228} level="M" marginSize={4}
          role="img" title={t('coaching.transfer.openOnPhone')} />
        <p className="text-center text-sm font-semibold">{account}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="mx-auto inline-flex min-h-11 items-center text-sm text-primary underline">
          {t('coaching.transfer.link')}
        </a>
      </DialogContent>
    </Dialog>
  );
}
