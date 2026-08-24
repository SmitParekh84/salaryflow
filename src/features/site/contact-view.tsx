"use client";

import { BRAND } from "@/lib/brand";
import { ArrowRight } from "lucide-react";
import styles from "./site.module.css";
import { Rise, SectionPage } from "./site-shell";

/**
 * Contact.
 *
 * The split between the two mailboxes is deliberate and worth stating on the
 * page: a data-protection request and a question about a bug should not land in
 * the same inbox, and telling people which is which is faster than routing it
 * afterwards. Both addresses are the ones published in the privacy policy, so
 * they have to stay in step with `BRAND`.
 */
const ROUTES = [
  {
    title: "Product questions and problems",
    body: "Something broken, something confusing, or a figure that looks wrong. Include what you were doing and roughly when — the app keeps a local history, so a time is usually enough to find it.",
    email: BRAND.supportEmail,
  },
  {
    title: "Privacy and your data",
    body: "A request to see, export or delete what Aartha holds about you. This goes to the address named in the privacy policy rather than the general mailbox.",
    email: BRAND.legalEmail,
  },
  {
    title: "Anything legal or formal",
    body: "Notices, agreements, and anything that needs a record. Same address as privacy requests.",
    email: BRAND.legalEmail,
  },
];

const SOCIAL = [
  {
    href: BRAND.linkedin,
    label: "LinkedIn",
    body: "Release notes, what changed and why, and the occasional note on how it is built.",
  },
  {
    href: BRAND.instagram,
    label: "Instagram",
    body: "Screens as they ship, and shorter notes on what is coming next.",
  },
];

export function ContactView() {
  return (
    <SectionPage
      hero={{
        eyebrow: "Contact",
        title: (
          <>
            Mail goes to a mailbox <span className={styles.accentWord}>someone opens.</span>
          </>
        ),
        lede: `${BRAND.name} is small, so there is no ticket queue and no chatbot. Expect a reply within two working days.`,
      }}
    >
      <Rise className={`${styles.section} ${styles.band}`} as="section">
        <div className={styles.sectionHead}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise>
            Where to send it
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-rise>
            Two mailboxes, on purpose.
          </h2>
        </div>

        <div className={styles.routeList}>
          {ROUTES.map((route) => (
            <div key={route.title} className={`${styles.routeRow} ${styles.reveal}`} data-rise>
              <strong>{route.title}</strong>
              <p>{route.body}</p>
              <a href={`mailto:${route.email}`}>
                {route.email}
                <ArrowRight aria-hidden />
              </a>
            </div>
          ))}
        </div>
      </Rise>

      <Rise className={styles.section} as="section">
        <div className={styles.sectionHead}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise>
            Elsewhere
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-rise>
            Not sure where to send it?
          </h2>
          <p className={`${styles.lead} ${styles.reveal}`} data-rise>
            Use <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>. It gets passed
            on if it belongs somewhere else.
          </p>
        </div>

        <div className={styles.routeList}>
          {SOCIAL.map((item) => (
            <div key={item.label} className={`${styles.routeRow} ${styles.reveal}`} data-rise>
              <strong>{item.label}</strong>
              <p>{item.body}</p>
              <a href={item.href} target="_blank" rel="noreferrer noopener">
                Follow
                <ArrowRight aria-hidden />
              </a>
            </div>
          ))}
        </div>
      </Rise>
    </SectionPage>
  );
}
