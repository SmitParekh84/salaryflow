import { EMAIL_COLORS, EMAIL_COLORS_DARK } from "@/lib/theme";

/**
 * Shared shell for every Spendly transactional email.
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
    .sp-mark     { background: ${D.brand} !important; color: ${D.brandOn} !important; }
    .sp-heading,
    .sp-wordmark { color: ${D.foreground} !important; }
    .sp-text     { color: ${D.muted} !important; }
    .sp-subtle   { color: ${D.subtle} !important; }
    .sp-panel    { background: ${D.background} !important; border-color: ${D.border} !important; }
    .sp-code     { color: ${D.foreground} !important; }
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
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="sp-card" style="max-width:520px;background:${L.surface};border:1px solid ${L.border};border-radius:16px;">
            <tr>
              <td style="padding:28px 32px 4px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" width="34" height="34" class="sp-mark" style="width:34px;height:34px;border-radius:9px;background:${L.brand};color:${L.brandOn};font-family:${SANS_STACK};font-size:17px;font-weight:700;line-height:34px;" aria-hidden="true">S</td>
                    <td class="sp-wordmark" style="padding-left:10px;font-family:${SANS_STACK};font-size:16px;font-weight:600;letter-spacing:-0.01em;color:${L.foreground};">Spendly</td>
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
                Spendly &middot; Spend with clarity.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
