"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import React, { useEffect, useState } from "react";

type User = { _id: string; email: string; name?: string; isAdmin?: boolean };

export default function AdminPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/admin/users", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setUsers(j.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/users", { credentials: "include" })
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled) setUsers(json.data || []);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleAdmin(id: string, makeAdmin: boolean) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/users/${id}?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isAdmin: makeAdmin }),
      });
      if (!res.ok) throw new Error("Failed");
      await fetchUsers();
    } catch {
      // ignore for demo
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete user? This is permanent.")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/users/${id}?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      await fetchUsers();
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin — Users</h1>
      {loading && <div>Loading…</div>}
      {!loading && users && (
        <Card className="overflow-x-auto shadow-none">
          <table className="min-w-full bg-surface">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Admin</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t">
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.name || "—"}</td>
                  <td className="px-4 py-2">{u.isAdmin ? "Yes" : "No"}</td>
                  <td className="px-4 py-2">
                    {!u.isAdmin && (
                      <Button size="sm" variant="success" disabled={actionLoading === u._id} onClick={() => toggleAdmin(u._id, true)} className="mr-2">Promote</Button>
                    )}
                    {u.isAdmin && (
                      <Button size="sm" variant="warning" disabled={actionLoading === u._id} onClick={() => toggleAdmin(u._id, false)} className="mr-2">Demote</Button>
                    )}
                    <Button size="sm" variant="danger" disabled={actionLoading === u._id} onClick={() => deleteUser(u._id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {!loading && users && users.length === 0 && <div>No users found.</div>}
    </div>
  );
}
