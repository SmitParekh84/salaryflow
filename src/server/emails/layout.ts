import { BRAND } from "@/lib/brand";
import { EMAIL_COLORS, EMAIL_COLORS_DARK } from "@/lib/theme";

/**
 * Shared shell for every Aartha transactional email.
 *
 * Email is a hostile rendering target — no external CSS, no custom properties,
 * no JavaScript, and a Word layout engine in Outlook. Everything here is
 * therefore table-based with inline styles, and every progressive enhancement
 * (dark scheme, rounded corners, system fonts) degrades to a plainer but still
 * correct email rather than a broken one.
 *
 * Templates supply only the card's inner content; the wrapper, header, footer
 * and colour handling live here so a second email is consistent by default
 * instead of by discipline.
 */

const L = EMAIL_COLORS;
const D = EMAIL_COLORS_DARK;

/** Navy backplate from the app icon (--ink-800). Only shows if images are blocked. */
const INK = "#07182f";

/**
 * Resolves to SF on Apple clients and Segoe on Windows. Falls back to Arial for
 * Outlook, which ignores the modern entries but honours the last one.
 */
export const SANS_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/**
 * Digit-first stack. Real monospace faces disambiguate 0/O and 1/l, which is the
 * entire job of a font rendering a code someone has to retype.
 */
export const MONO_STACK =
  "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";

/**
 * Absolute origin for images in email.
 *
 * The recipient's mail client fetches these from the public internet, so a
 * localhost `NEXTAUTH_URL` is useless — a dev send would show a broken logo.
 * Development therefore falls back to production so test emails still render.
 */
const PUBLIC_ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim().replace(/\/+$/, "") || BRAND.url;

function assetOrigin() {
  const base = process.env.NEXTAUTH_URL?.trim().replace(/\/+$/, "");
  if (!base || base.includes("localhost") || base.includes("127.0.0.1")) return PUBLIC_ORIGIN;
  return base;
}

/** The app icon — the same file the dashboard, auth pages and manifest use. */
const MARK_PX = 34;

/**
 * Absolute URL for a link in an email.
 *
 * Every href has to survive leaving our origin, so a relative path is not an
 * option — it would resolve against the mail client. Shares `assetOrigin()`
 * with the logo so a dev send points somewhere that actually exists rather
 * than at localhost.
 */
export function emailLink(path: string) {
  return `${assetOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

type ShellOptions = {
  /** Document title. Not shown in the message body. */
  title: string;
  /** Inbox preview line. Front-load the useful part — see below. */
  preheader: string;
  /** Card content as HTML. Supplied by the template. */
  content: string;
};

/**
 * Dark-scheme overrides.
 *
 * Inline styles beat a stylesheet, so each rule needs `!important` to win.
 * Clients that strip <style> or ignore media queries keep the light palette.
 */
const DARK_SCHEME_CSS = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: dark) {
    .sp-canvas   { background: ${D.background} !important; }
    .sp-card     { background: ${D.surface} !important; border-color: ${D.border} !important; }
    .sp-heading,
    .sp-wordmark { color: ${D.foreground} !important; }
    .sp-text     { color: ${D.muted} !important; }
    .sp-subtle   { color: ${D.subtle} !important; }
    .sp-panel    { background: ${D.background} !important; border-color: ${D.border} !important; }
    .sp-code     { color: ${D.foreground} !important; }
    .sp-btn      { background: ${D.brand} !important; }
    .sp-btn a    { color: ${D.brandOn} !important; }
  }
`;

export function renderShell({ title, preheader, content }: ShellOptions) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHtml(title)}</title>
    <style>${DARK_SCHEME_CSS}</style>
  </head>
  <body class="sp-canvas" style="margin:0;padding:0;width:100%;background:${L.background};color:${L.foreground};font-family:${SANS_STACK};-webkit-font-smoothing:antialiased;">
    <!-- Preheader: the inbox list preview. The trailing filler stops Gmail from
         pulling the first line of the card in after it. -->
    <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}
      ${"&zwnj;&nbsp;".repeat(60)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="sp-canvas" style="background:${L.background};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <!-- Ghost table: Outlook's Word engine ignores max-width, so without
               this the card stretches to the full window. Outlook-only. -->
          <!--[if mso]>
          <table role="presentation" width="520" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td>
          <![endif]-->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="sp-card" style="max-width:520px;background:${L.surface};border:1px solid ${L.border};border-radius:16px;">
            <tr>
              <td style="padding:28px 32px 4px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <!-- The icon carries its own navy backplate, so it needs no
                         tile behind it and reads correctly in both schemes. The
                         td colour is only the images-blocked fallback. -->
                    <td width="${MARK_PX}" height="${MARK_PX}" style="width:${MARK_PX}px;height:${MARK_PX}px;border-radius:9px;background:${INK};font-size:0;line-height:0;">
                      <img src="${assetOrigin()}/icons/icon-192.png" width="${MARK_PX}" height="${MARK_PX}" alt="" aria-hidden="true" style="display:block;width:${MARK_PX}px;height:${MARK_PX}px;border:0;border-radius:9px;outline:none;text-decoration:none;">
                    </td>
                    <td class="sp-wordmark" style="padding-left:10px;font-family:${SANS_STACK};font-size:16px;font-weight:600;letter-spacing:-0.01em;color:${L.foreground};">${BRAND.name}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px;">${content}</td>
            </tr>
          </table>
          <!-- Signature line, set quiet enough to read as a sign-off. -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;">
            <tr>
              <td align="center" class="sp-subtle" style="padding:20px 8px 0;font-family:${SANS_STACK};font-size:12px;line-height:1.5;color:${L.subtle};">
                ${BRAND.name} &middot; ${BRAND.brandline}
              </td>
            </tr>
          </table>
          <!--[if mso]></td></tr></table><![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>`;
}


type ButtonOptions = {
  /** Absolute URL. A relative href is meaningless once the mail leaves us. */
  href: string;
  label: string;
};

/**
 * The one call-to-action button, shared by every template that has somewhere to
 * send the reader.
 *
 * Deliberately absent from the OTP email, which has no destination — its payload
 * is six digits you retype, and a button would only compete with them. This
 * exists so the templates that *do* have a destination share one implementation
 * rather than hand-rolling a table each.
 *
 * A table with a background colour on the `td`, not a styled `<a>`: Outlook
 * ignores padding and background on inline anchors, so a CSS-only button
 * collapses to bare underlined text there. `mso-padding-alt` and the explicit
 * line-height keep the Word engine from adding its own leading.
 */
export function renderButton({ href, label }: ButtonOptions) {
  const safeHref = escapeHtml(href);
  return `
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 0;">
                  <tr>
                    <td class="sp-btn" align="center" style="border-radius:10px;background:${L.brand};mso-padding-alt:14px 26px;">
                      <a href="${safeHref}" style="display:inline-block;padding:14px 26px;font-family:${SANS_STACK};font-size:15px;font-weight:600;line-height:1;mso-line-height-rule:exactly;color:${L.brandOn};text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
                    </td>
                  </tr>
                </table>`;
}
