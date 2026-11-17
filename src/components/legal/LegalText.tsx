import { Fragment } from 'react';

export const LEGAL_CONTACT_EMAIL = 'support@fittechs.com';
/** Date and version of the current Privacy Policy / Terms text (update both together). */
export const LEGAL_UPDATED = new Date(Date.UTC(2026, 10, 17));
export const LEGAL_VERSION = '2026-11-v2';

/** Renders legal copy and turns every occurrence of the contact address into a clickable mailto link. */
export function LegalText({ text }: { text: string }) {
  const parts = text.split(LEGAL_CONTACT_EMAIL);
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 && <ContactEmail />}
        </Fragment>
      ))}
    </>
  );
}

export function ContactEmail() {
  return <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary underline underline-offset-2">{LEGAL_CONTACT_EMAIL}</a>;
}
