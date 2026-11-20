import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useTranslation} from 'react-i18next';
import i18n,{i18nInit,languages} from '../../../src/i18n';
import {restoreAccountLanguage} from '../../../src/i18n/changeLanguage';
import {HelpDialog} from '../../../src/components/help/HelpDialog';
import '../../../src/index.css';
function Screen(){const {t}=useTranslation();const [open,setOpen]=useState(false);return <>
 <output data-testid="language">{i18n.resolvedLanguage}</output><output data-testid="label">{t('common.loading')}</output>
 {languages.map(l=><button key={l.code} onClick={()=>void i18n.changeLanguage(l.code)}>{l.code}</button>)}
 <button onClick={()=>restoreAccountLanguage('11111111-2222-4333-8444-555555555555')}>Restore account</button>
 <button onClick={()=>setOpen(true)}>Open help</button><HelpDialog open={open} onOpenChange={setOpen}/>
 </>}
await i18nInit;createRoot(document.getElementById('root')!).render(<Screen/>);
