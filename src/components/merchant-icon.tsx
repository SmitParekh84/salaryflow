"use client";

import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/utils";
import {
  SiAirtel,
  SiAirtelHex,
  SiAxisbank,
  SiAxisbankHex,
  SiBigbasket,
  SiBigbasketHex,
  SiBookmyshow,
  SiBookmyshowHex,
  SiDunzo,
  SiDunzoHex,
  SiGooglepay,
  SiGooglepayHex,
  SiHdfcbank,
  SiHdfcbankHex,
  SiHp,
  SiHpHex,
  SiIcicibank,
  SiIcicibankHex,
  SiJio,
  SiJioHex,
  SiMcdonalds,
  SiMcdonaldsHex,
  SiNetflix,
  SiNetflixHex,
  SiPaytm,
  SiPaytmHex,
  SiPhonepe,
  SiPhonepeHex,
  SiRazorpay,
  SiRazorpayHex,
  SiSpotify,
  SiSpotifyHex,
  SiStarbucks,
  SiStarbucksHex,
  SiSwiggy,
  SiSwiggyHex,
  SiUber,
  SiUberHex,
  SiVodafone,
  SiVodafoneHex,
  SiYoutube,
  SiYoutubeHex,
  SiZerodha,
  SiZerodhaHex,
  SiZomato,
  SiZomatoHex,
} from "@icons-pack/react-simple-icons";
import type { ComponentType } from "react";

type BrandGlyph = ComponentType<{ size?: number; color?: string; title?: string }>;

type Brand = { icon: BrandGlyph; hex: string; label: string };

/**
 * Merchant marks, keyed by the words that identify them.
 *
 * A lookup is by whole word, never substring: a two-letter key like `hp` would
 * otherwise fire on "shop" and "iPhone". Aliases are listed for the names
 * people actually type — "gpay" for Google Pay, "kite" for Zerodha's app.
 *
 * Only brands that exist in Simple Icons are here. Several a user in India will
 * hit often — Groww, Myntra, Amazon Pay, Blinkit, IndianOil, Tata Play — have
 * no icon in the set, and those rows keep their category glyph rather than
 * getting a hand-drawn stand-in that looks nothing like the real mark.
 *
 * The SVGs are CC0; the trademarks belong to their owners. Using a mark to
 * label a transaction with that merchant is nominative use.
 */
const BRANDS: Record<string, Brand> = {
  airtel: { icon: SiAirtel, hex: SiAirtelHex, label: "Airtel" },
  axis: { icon: SiAxisbank, hex: SiAxisbankHex, label: "Axis Bank" },
  bigbasket: { icon: SiBigbasket, hex: SiBigbasketHex, label: "BigBasket" },
  bookmyshow: { icon: SiBookmyshow, hex: SiBookmyshowHex, label: "BookMyShow" },
  dunzo: { icon: SiDunzo, hex: SiDunzoHex, label: "Dunzo" },
  gpay: { icon: SiGooglepay, hex: SiGooglepayHex, label: "Google Pay" },
  hdfc: { icon: SiHdfcbank, hex: SiHdfcbankHex, label: "HDFC Bank" },
  hp: { icon: SiHp, hex: SiHpHex, label: "HP" },
  icici: { icon: SiIcicibank, hex: SiIcicibankHex, label: "ICICI Bank" },
  jio: { icon: SiJio, hex: SiJioHex, label: "Jio" },
  kite: { icon: SiZerodha, hex: SiZerodhaHex, label: "Zerodha" },
  mcdonalds: { icon: SiMcdonalds, hex: SiMcdonaldsHex, label: "McDonald's" },
  netflix: { icon: SiNetflix, hex: SiNetflixHex, label: "Netflix" },
  paytm: { icon: SiPaytm, hex: SiPaytmHex, label: "Paytm" },
  phonepe: { icon: SiPhonepe, hex: SiPhonepeHex, label: "PhonePe" },
  razorpay: { icon: SiRazorpay, hex: SiRazorpayHex, label: "Razorpay" },
  spotify: { icon: SiSpotify, hex: SiSpotifyHex, label: "Spotify" },
  starbucks: { icon: SiStarbucks, hex: SiStarbucksHex, label: "Starbucks" },
  swiggy: { icon: SiSwiggy, hex: SiSwiggyHex, label: "Swiggy" },
  uber: { icon: SiUber, hex: SiUberHex, label: "Uber" },
  vodafone: { icon: SiVodafone, hex: SiVodafoneHex, label: "Vodafone" },
  vi: { icon: SiVodafone, hex: SiVodafoneHex, label: "Vi" },
  youtube: { icon: SiYoutube, hex: SiYoutubeHex, label: "YouTube" },
  zerodha: { icon: SiZerodha, hex: SiZerodhaHex, label: "Zerodha" },
  zomato: { icon: SiZomato, hex: SiZomatoHex, label: "Zomato" },
};

/** Multi-word merchant names that no single token identifies. */
const PHRASE_ALIASES: Record<string, string> = {
  "google pay": "gpay",
  "prime video": "youtube",
  instamart: "swiggy",
};

/**
 * The same mark, light enough to read on a dark surface.
 *
 * Brand hexes are picked for white paper, and several here are all but black —
 * Uber's #000000, Jio's and Razorpay's navy. A flat "mix 28% white" rule left
 * Uber at rgb(71,71,71) on a #202a38 card, which is a smudge rather than a
 * logo, while over-lightening the vivid brands turned Netflix pink. So each
 * colour is mixed toward white only until it clears a luminance floor: Swiggy's
 * orange is already past it and comes through untouched, black goes to a mid
 * grey, and every mark is recognisably itself.
 *
 * Both values are handed to CSS as variables and `globals.css` picks one per
 * theme, so nothing here needs to know which theme is active — which matters,
 * because the theme is only known after hydration and these render on the
 * server too.
 */
const DARK_LUMINANCE_FLOOR = 0.32;

function channelToLinear(value: number): number {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

function liftForDark(hex: string): string {
  const parsed = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!parsed) return hex;
  const value = Number.parseInt(parsed[1], 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  // Walk toward white in 5% steps and stop at the first mix that clears the
  // floor. Coarse on purpose: the difference between a 35% and a 40% mix is not
  // visible, and this runs once per brand at module load.
  for (let mix = 0; mix <= 100; mix += 5) {
    const t = mix / 100;
    const mixed = [red, green, blue].map((channel) => channel + (255 - channel) * t) as [
      number,
      number,
      number,
    ];
    if (relativeLuminance(...mixed) >= DARK_LUMINANCE_FLOOR) {
      const toHex = (channel: number) => Math.round(channel).toString(16).padStart(2, "0");
      return `#${toHex(mixed[0])}${toHex(mixed[1])}${toHex(mixed[2])}`;
    }
  }
  return "#ffffff";
}

export function brandFor(merchant?: string): Brand | undefined {
  if (!merchant) return undefined;
  const normalized = merchant
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!normalized) return undefined;

  for (const [phrase, key] of Object.entries(PHRASE_ALIASES)) {
    if (normalized.includes(phrase)) return BRANDS[key];
  }
  for (const token of normalized.split(" ")) {
    const brand = BRANDS[token];
    if (brand) return brand;
  }
  return undefined;
}

/**
 * The merchant's own mark where there is one, the category glyph where there
 * isn't. `chipClassName` styles the surrounding swatch, which is tinted from the
 * brand colour so the row reads as that merchant rather than as its category.
 */
export function MerchantIcon({
  merchant,
  category,
  size = 18,
  categoryColor,
  chipClassName,
}: {
  merchant?: string;
  category: string;
  size?: number;
  /** Fallback tint, used when the merchant has no brand mark. */
  categoryColor: string;
  chipClassName?: string;
}) {
  const brand = brandFor(merchant);
  const Glyph = brand?.icon;

  return (
    <div
      className={cn("brand-chip flex shrink-0 items-center justify-center", chipClassName)}
      style={
        brand
          ? ({
              "--brand-color": brand.hex,
              "--brand-color-dark": liftForDark(brand.hex),
            } as React.CSSProperties)
          : { backgroundColor: `color-mix(in srgb, ${categoryColor} 15%, transparent)` }
      }
    >
      {Glyph ? (
        <Glyph size={size} color="currentColor" title={brand.label} />
      ) : (
        <CategoryIcon category={category} className={size <= 18 ? "h-4.5 w-4.5" : "h-5 w-5"} />
      )}
    </div>
  );
}
