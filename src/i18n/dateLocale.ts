import { enUS, tr as trLocale, es, ptBR, fr } from "date-fns/locale";

export const getDateLocale = (lang: string) => {
  switch (lang.split("-")[0]) {
    case 'tr': return trLocale;
    case 'es': return es;
    case 'pt': return ptBR;
    case 'fr': return fr;
    default: return enUS;
  }
};
