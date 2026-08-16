/* ---------------------------------------------------------------------------
   What an emergency fund should hold.

   The target used to be a blank field with a placeholder, which asks someone to
   invent a number for the one goal whose whole purpose is a known quantity: how
   long you could keep paying for your life with no income arriving. Six months
   is the common rule of thumb, and it is a rule of thumb — the app suggests,
   the user decides.

   Salary is the better basis when there is one, because it is what actually
   stops arriving. Someone paid irregularly has no salary figure to multiply,
   so their outgoings stand in: rent and bills still have to be covered for the
   same six months whether or not a payslip explains them.
   --------------------------------------------------------------------------- */

/** The months of cover the suggestion, and the rest of the app, talk about. */
export const EMERGENCY_FUND_MONTHS = 6;

export type EmergencyFundSuggestion = {
  amount: number;
  months: number;
  basis: "salary" | "outgoings";
};

/**
 * A suggested emergency fund target, or null when neither figure is known.
 *
 * Null is deliberate: a suggestion built from no information is a made-up
 * number wearing the app's authority, and the field is better left blank than
 * pre-filled with one.
 */
export function suggestEmergencyFund({
  monthlySalary,
  monthlyOutgoings = 0,
  months = EMERGENCY_FUND_MONTHS,
}: {
  monthlySalary: number;
  monthlyOutgoings?: number;
  months?: number;
}): EmergencyFundSuggestion | null {
  const basis: "salary" | "outgoings" = monthlySalary > 0 ? "salary" : "outgoings";
  const monthly = basis === "salary" ? monthlySalary : monthlyOutgoings;
  if (!(monthly > 0)) return null;

  // Rounded up to a whole thousand: a target is a floor to reach, so the
  // rounding should never leave it below the months it claims to cover.
  const amount = Math.ceil((monthly * months) / 1000) * 1000;
  return { amount, months, basis };
}
