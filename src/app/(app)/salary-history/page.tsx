"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { localDateInputValue, newestFirst, parseFinancialDate } from "@/lib/utils";

type Item = { _id: string; amount: number; date: string; confirmed?: boolean; source?: string; note?: string };

export default function SalaryHistoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number | string>("");
  const [date, setDate] = useState<string>(localDateInputValue());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/salary/history", { credentials: "include" });
      const j = await res.json();
      setItems(newestFirst(j.data || []));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch("/api/salary/history", { credentials: "include" })
      .then((response) => response.json())
      .then((result) => {
        if (active) setItems(newestFirst(result.data || []));
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const add = async () => {
    setSaving(true);
    try {
      const numeric = Number(amount);
      const res = await fetch("/api/salary/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: numeric, date: date, note }),
      });
      if (res.ok) {
        await fetchItems();
        setAmount("");
        setNote("");
      }
    } catch {}
    setSaving(false);
  };

  const toggleConfirm = async (id: string, curr: boolean) => {
    try {
      await fetch(`/api/salary/history?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirmed: !curr }),
      });
      await fetchItems();
    } catch {}
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this entry?")) return;
    try {
      await fetch(`/api/salary/history?id=${id}`, { method: "DELETE", credentials: "include" });
      await fetchItems();
    } catch {}
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Salary history</h1>
      <p className="text-sm text-muted mb-4">Log actual salary credits (overtime, deductions, bonuses) and confirm when payroll posts.</p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <input className="p-2 border rounded" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
        <input className="p-2 border rounded" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="p-2 border rounded" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
      </div>
      <div className="mb-6">
        <button onClick={add} disabled={saving || !amount} className="rounded bg-primary px-4 py-2 text-white">Add entry</button>
      </div>

      {loading && <div>Loading…</div>}
      {!loading && items.length === 0 && <div className="text-sm text-muted">No salary entries yet.</div>}

      <div className="mt-4 space-y-3">
        {items.map((it) => (
          <div key={it._id} className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="text-sm font-medium">{it.source || "Salary"}</div>
              <div className="text-lg font-semibold">{it.amount.toLocaleString()}</div>
              <div className="text-xs text-muted">{format(parseFinancialDate(it.date), "dd LLL yyyy")} {it.note ? `— ${it.note}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleConfirm(it._id, !!it.confirmed)} className={`px-3 py-1 rounded text-sm ${it.confirmed ? 'bg-green-600 text-white' : 'bg-surface-2'}`}>{it.confirmed ? 'Confirmed' : 'Confirm'}</button>
              <button onClick={() => remove(it._id)} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
