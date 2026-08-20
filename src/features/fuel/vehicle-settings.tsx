"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { DEFAULT_VEHICLE } from "@/lib/fuel";
import { useFinanceStore } from "@/lib/store";
import { useState } from "react";

/**
 * The vehicle exists so a mileage can be sanity-checked, and the city so a rate
 * can be looked up. Both are optional: without them fills still record, they
 * just lose the plausibility check and the rate prefill.
 */
export function VehicleSettings() {
  const profile = useFinanceStore((state) => state.profile);
  const updateProfile = useFinanceStore((state) => state.updateProfile);
  const syncWithServer = useFinanceStore((state) => state.syncWithServer);
  const vehicle = profile.vehicle ?? DEFAULT_VEHICLE;

  const [draft, setDraft] = useState({
    city: profile.city ?? "",
    name: vehicle.name,
    year: vehicle.year ? String(vehicle.year) : "",
    minKmpl: String(vehicle.minKmpl),
    maxKmpl: String(vehicle.maxKmpl),
  });
  const [saved, setSaved] = useState(false);

  const minKmpl = Number(draft.minKmpl);
  const maxKmpl = Number(draft.maxKmpl);
  const rangeIsValid = minKmpl > 0 && maxKmpl > minKmpl;

  const update = (patch: Partial<typeof draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const save = async () => {
    if (!rangeIsValid) return;
    updateProfile({
      city: draft.city.trim() || undefined,
      vehicle: {
        name: draft.name.trim() || DEFAULT_VEHICLE.name,
        year: draft.year ? Number(draft.year) : undefined,
        minKmpl,
        maxKmpl,
      },
    });
    setSaved(true);
    await syncWithServer();
  };

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="fuel-city">City</Label>
        <Input
          id="fuel-city"
          placeholder="e.g. Surat"
          value={draft.city}
          onChange={(event) => update({ city: event.target.value })}
        />
        <p className="mt-1 text-xs text-muted">
          Petrol prices differ by several rupees a litre between states, so a rate lookup needs to
          know where you fill up.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="vehicle-name">Vehicle</Label>
          <Input
            id="vehicle-name"
            placeholder="Activa 125"
            value={draft.name}
            onChange={(event) => update({ name: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="vehicle-year">Year</Label>
          <Input
            id="vehicle-year"
            type="number"
            inputMode="numeric"
            placeholder="2021"
            value={draft.year}
            onChange={(event) => update({ year: event.target.value })}
          />
        </div>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="vehicle-min">Lowest believable kmpl</Label>
            <Input
              id="vehicle-min"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={draft.minKmpl}
              onChange={(event) => update({ minKmpl: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="vehicle-max">Highest believable kmpl</Label>
            <Input
              id="vehicle-max"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={draft.maxKmpl}
              onChange={(event) => update({ maxKmpl: event.target.value })}
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-muted">
          A fill-up whose mileage lands outside this range is set aside instead of counted — nearly
          always because an earlier fill went unrecorded. You can still count it by hand from the
          fuel report.
        </p>
        {!rangeIsValid && (
          <p className="mt-1 text-xs text-danger">
            The highest figure must be above the lowest, and both above zero.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={!rangeIsValid}>
          Save
        </Button>
        {saved && <span className="text-xs text-muted">Saved</span>}
      </div>
    </div>
  );
}
