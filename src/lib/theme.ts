/**
 * Colour tokens for TypeScript consumers.
 *
 * The single source of truth for the UI is src/app/globals.css. Everything in
 * `CHART_COLORS` / `CATEGORY_COLORS` is a `var(--token)` reference, so changing
 * a value in globals.css changes it here too — including inside Recharts, which
 * resolves CSS variables in SVG `fill`/`stroke` attributes.
 *
 * `EMAIL_COLORS` is the one exception: email clients strip CSS custom
 * properties, so those values must be literal hex and must be kept in sync with
 * the LAYER 1 palette in globals.css by hand.
 */

/** Named chart series. Use these instead of literal hex in views and charts. */
export const CHART_COLORS = {
  income: "var(--chart-income)",
  expense: "var(--chart-expense)",
  savings: "var(--chart-savings)",
  invest: "var(--chart-invest)",
  goal: "var(--chart-goal)",
  gain: "var(--chart-gain)",
  loss: "var(--chart-loss)",
} as const;

/** Semantic UI tokens that need to be passed as inline style values. */
export const UI_COLORS = {
  primary: "var(--primary)",
  accent: "var(--accent)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  muted: "var(--muted)",
  border: "var(--border)",
} as const;

/** Default expense-category swatches. Custom categories store their own hex. */
export const CATEGORY_COLORS = {
  food: "var(--cat-food)",
  groceries: "var(--cat-groceries)",
  fuel: "var(--cat-fuel)",
  travel: "var(--cat-travel)",
  shopping: "var(--cat-shopping)",
  entertainment: "var(--cat-entertainment)",
  emi: "var(--cat-emi)",
  rent: "var(--cat-rent)",
  utilities: "var(--cat-utilities)",
  mobile: "var(--cat-mobile)",
  insurance: "var(--cat-insurance)",
  medical: "var(--cat-medical)",
  education: "var(--cat-education)",
  investment: "var(--cat-investment)",
  subscriptions: "var(--cat-subscriptions)",
  pets: "var(--cat-pets)",
  family: "var(--cat-family)",
  personalCare: "var(--cat-personal-care)",
  business: "var(--cat-business)",
  other: "var(--cat-other)",
} as const;

/** Fallback used when a category has no swatch of its own. */
export const FALLBACK_CATEGORY_COLOR = CATEGORY_COLORS.other;

/**
 * Literal hex mirror of the globals.css palette, for contexts that cannot
 * resolve CSS variables: transactional email and the PWA theme colour.
 * Keep in sync with LAYER 1 of src/app/globals.css.
 */
export const EMAIL_COLORS = {
  brand: "#07836a",
  brandOn: "#ffffff",
  background: "#f2f2f7",
  surface: "#ffffff",
  border: "#e5e5ea",
  foreground: "#1d1d1f",
  muted: "#6e6e73",
  subtle: "#8e8e93",
} as const;

/**
 * Starting swatch for a user-created category. `<input type="color">` only
 * accepts a literal hex, so this cannot be a token — mirrors --hue-sky.
 */
export const PICKER_DEFAULT_COLOR = "#0ea5e9";

/** Browser/OS chrome colour per theme. Must be literal hex. */
export const THEME_COLORS = {
  light: "#f2f2f7",
  dark: "#000000",
} as const;
