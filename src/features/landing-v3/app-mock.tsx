"use client";

import { BRAND } from "@/lib/brand";
import { formatMoney } from "@/lib/utils";
import {
  BadgeIndianRupee,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  FileUp,
  Landmark,
  LayoutDashboard,
  Receipt,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import styles from "./landing-v3.module.css";

/* ---------------------------------------------------------------------------
   The product, drawn.

   Every screen below is built from divs and inline SVG rather than being a
   screenshot. That is a deliberate trade:

     + it needs no image assets, so the page is finishable now
     + it is sharp at any size and in both themes, and weighs nothing
     + the figures come from the same demo account the copy quotes, so the
       page cannot contradict itself
     - it is not literally the app, so it has to be kept honest by hand: every
       screen here mirrors a real route, and nothing is shown that the app
       cannot do

   All amounts trace back to one demo account: ₹85,000 salary, ₹25,298 of bills,
   ₹15,000 to savings, ₹10,000 to investments, leaving ₹34,702 for the cycle and
   ₹1,029 safe to spend today.
   --------------------------------------------------------------------------- */

export const DEMO = {
  salary: 85_000,
  bills: 25_298,
  savings: 15_000,
  investments: 10_000,
  available: 34_702,
  safeToday: 1_029,
  daysToPayday: 12,
} as const;

/** Short money, for chart labels where the full figure will not fit. */
export function shortMoney(value: number) {
  return value >= 1000 ? `₹${Math.round(value / 100) / 10}k` : `₹${value}`;
}

/* ── Device frame ───────────────────────────────────────────────────────────
   A phone-shaped window, not a photorealistic mockup: a bezel, a notch and a
   rounded screen. A rendered device that tries to look real invites the reader
   to notice it is not, and the point is the screen, not the hardware. */

export function Device({
  children,
  label,
}: {
  children: React.ReactNode;
  /** Announced to a screen reader in place of the drawn screen. */
  label: string;
}) {
  return (
    <div className={styles.device} role="img" aria-label={label}>
      <div className={styles.deviceNotch} aria-hidden />
      <div className={styles.deviceScreen} aria-hidden>
        {children}
      </div>
    </div>
  );
}

/* ── Screen: dashboard ─────────────────────────────────────────────────────── */

export function DashboardScreen() {
  return (
    <div className={styles.screen}>
      <ScreenBar icon={<LayoutDashboard aria-hidden />} title="Today" />

      <div className={styles.safeCard}>
        <span className={styles.safeLabel}>Safe to spend today</span>
        <strong className={`${styles.safeNumber} ${styles.tnum}`} data-count-safe>
          {formatMoney(DEMO.safeToday)}
        </strong>
        <span className={styles.safeMeta}>
          {DEMO.daysToPayday} days until payday · on track
        </span>
        <div className={styles.safeTrack} aria-hidden>
          <i style={{ width: "41%" }} />
        </div>
      </div>

      <div className={styles.rowList}>
        <MoneyRow label="Salary this cycle" value={DEMO.salary} tone="in" />
        <MoneyRow label="Bills & commitments" value={-DEMO.bills} />
        <MoneyRow label="Savings & investments" value={-(DEMO.savings + DEMO.investments)} />
        <MoneyRow label="Left for the cycle" value={DEMO.available} tone="accent" />
      </div>
    </div>
  );
}

/* ── Screen: bills calendar ────────────────────────────────────────────────── */

/** Day-of-month positions that carry a bill in the demo account. */
const BILL_DAYS: Record<number, "due" | "paid"> = {
  2: "paid",
  5: "paid",
  11: "paid",
  14: "due",
  18: "due",
  25: "due",
  28: "due",
};

export function BillsScreen() {
  return (
    <div className={styles.screen}>
      <ScreenBar icon={<CalendarClock aria-hidden />} title="Bills" />

      <div className={styles.calendar} aria-hidden>
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <span key={`${day}-${index}`} className={styles.calendarHead}>
            {day}
          </span>
        ))}
        {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
          const state = BILL_DAYS[day];
          return (
            <span
              key={day}
              className={`${styles.calendarDay} ${
                state === "paid"
                  ? styles.dayPaid
                  : state === "due"
                    ? styles.dayDue
                    : ""
              }`}
              data-calendar-day
            >
              {day}
            </span>
          );
        })}
      </div>

      <div className={styles.rowList}>
        <MoneyRow label="Rent · 25th" value={-18_000} />
        <MoneyRow label="Electricity · 14th" value={-2_450} />
        <MoneyRow label="Phone · 18th" value={-799} />
        <MoneyRow label="Protected in total" value={-DEMO.bills} tone="accent" />
      </div>
    </div>
  );
}

/* ── Screen: analytics ─────────────────────────────────────────────────────── */

const CATEGORIES = [
  { label: "Rent", value: 18_000 },
  { label: "Food", value: 7_400 },
  { label: "Transport", value: 3_180 },
  { label: "Bills", value: 3_249 },
  { label: "Fun", value: 2_140 },
] as const;

export function AnalyticsScreen() {
  const max = Math.max(...CATEGORIES.map((category) => category.value));
  return (
    <div className={styles.screen}>
      <ScreenBar icon={<BarChart3 aria-hidden />} title="Analytics" />
      <p className={styles.screenNote}>This cycle, by category</p>

      <div className={styles.bars}>
        {CATEGORIES.map((category) => (
          <div key={category.label} className={styles.barRow}>
            <span className={styles.barLabel}>{category.label}</span>
            <span className={styles.barTrack}>
              {/* The width is carried as a custom property rather than as an
                  inline width so GSAP can animate `--grow` from 0 and the bar
                  still has its final size with no script at all. */}
              <i
                data-bar
                style={{ "--grow": `${Math.round((category.value / max) * 100)}%` } as React.CSSProperties}
              />
            </span>
            <span className={`${styles.barValue} ${styles.tnum}`}>{shortMoney(category.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Screen: Aartha AI ─────────────────────────────────────────────────────── */

export function AiScreen() {
  return (
    <div className={styles.screen}>
      <ScreenBar icon={<Sparkles aria-hidden />} title={BRAND.assistantName} />

      <div className={styles.chat}>
        <p className={`${styles.chatBubble} ${styles.chatYou}`}>
          Can I book a ₹40,000 trip for December?
        </p>
        <p className={`${styles.chatBubble} ${styles.chatAi}`}>
          Not out of this cycle — it would take today&rsquo;s number to zero for eleven
          days.
        </p>
        <p className={`${styles.chatBubble} ${styles.chatAi}`}>
          December is three paydays out. Set aside <b>₹13,400</b> a cycle and it is
          covered, with your bills and the goal deadline untouched.
        </p>
      </div>
    </div>
  );
}

/* ── Shared screen furniture ───────────────────────────────────────────────── */

function ScreenBar({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className={styles.screenBar}>
      <span className={styles.screenIcon}>{icon}</span>
      {title}
    </div>
  );
}

function MoneyRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "in" | "accent";
}) {
  return (
    <span className={styles.moneyRow}>
      <span>{label}</span>
      <b
        className={`${styles.tnum} ${
          tone === "accent" ? styles.rowAccent : tone === "in" ? styles.rowIn : ""
        }`}
      >
        {value < 0 ? `−${formatMoney(Math.abs(value))}` : formatMoney(value)}
      </b>
    </span>
  );
}

/* ── The salary split, as a diagram ────────────────────────────────────────────
   One inline SVG rather than four boxes and some arrows in HTML: the paths are
   the point, and DrawSVGPlugin can only draw a real stroke. `vector-effect`
   keeps the strokes one pixel at every scale, so the diagram does not thicken
   as the viewport grows. */

export const SPLIT = [
  { key: "bills", label: "Bills", amount: DEMO.bills, y: 40 },
  { key: "savings", label: "Savings", amount: DEMO.savings, y: 110 },
  { key: "investments", label: "Investments", amount: DEMO.investments, y: 180 },
  { key: "available", label: "Yours to spend", amount: DEMO.available, y: 250 },
] as const;

export function SplitDiagram() {
  return (
    <svg
      className={styles.diagram}
      viewBox="0 0 720 290"
      role="img"
      aria-label={`A salary of ${formatMoney(DEMO.salary)} dividing into ${formatMoney(
        DEMO.bills,
      )} of bills, ${formatMoney(DEMO.savings)} of savings, ${formatMoney(
        DEMO.investments,
      )} of investments and ${formatMoney(DEMO.available)} left to spend.`}
    >
      <defs>
        <linearGradient id="v3-flow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00cfd1" />
          <stop offset="100%" stopColor="#88e84d" />
        </linearGradient>
      </defs>

      {/* Source */}
      <g>
        <rect
          x="1"
          y="120"
          width="150"
          height="52"
          rx="12"
          className={styles.diagramNode}
          vectorEffect="non-scaling-stroke"
        />
        <text x="76" y="141" className={styles.diagramCaption} textAnchor="middle">
          SALARY
        </text>
        <text x="76" y="161" className={styles.diagramFigure} textAnchor="middle">
          {formatMoney(DEMO.salary)}
        </text>
      </g>

      {SPLIT.map((branch) => (
        <g key={branch.key}>
          {/* A cubic that leaves the source horizontally and arrives
              horizontally, so every branch reads as the same gesture at a
              different angle. */}
          <path
            data-flow
            d={`M151 146 C 260 146, 300 ${branch.y + 21}, 420 ${branch.y + 21}`}
            fill="none"
            stroke="url(#v3-flow)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {/* One `data-node` per branch, on the group rather than on each of
              its three pieces: the scene staggers these against the four paths,
              and tagging rect, label and figure separately made it twelve
              targets stretched over four times the intended duration. */}
          <g data-node>
            <rect
              x="420"
              y={branch.y}
              width="299"
              height="42"
              rx="10"
              className={
                branch.key === "available" ? styles.diagramNodeLive : styles.diagramNode
              }
              vectorEffect="non-scaling-stroke"
            />
            <text x="440" y={branch.y + 27} className={styles.diagramLabel}>
              {branch.label}
            </text>
            <text
              x="699"
              y={branch.y + 27}
              className={
                branch.key === "available" ? styles.diagramFigureLive : styles.diagramFigure
              }
              textAnchor="end"
            >
              {formatMoney(branch.amount)}
            </text>
          </g>
        </g>
      ))}
    </svg>
  );
}

/* ── Compact feature tile ─────────────────────────────────────────────────────
   Icon, name, nothing else. The previous draft gave each of the thirteen
   features a sentence, which is thirteen sentences the reader has to get
   through to learn one fact: the app covers all of it. */

export const FEATURES = [
  { Icon: LayoutDashboard, label: "Dashboard" },
  { Icon: BadgeIndianRupee, label: "Salary plan" },
  { Icon: Landmark, label: "Accounts" },
  { Icon: Receipt, label: "Expenses" },
  { Icon: Users, label: "Shared spending" },
  { Icon: CalendarClock, label: "Bills" },
  { Icon: Target, label: "Goals" },
  { Icon: TrendingUp, label: "Investments" },
  { Icon: BarChart3, label: "Analytics" },
  { Icon: Sparkles, label: BRAND.assistantName },
  { Icon: CheckCircle2, label: "Budget rules" },
  { Icon: FileUp, label: "Statement import" },
  { Icon: Trash2, label: "Recycle bin" },
] as const;
