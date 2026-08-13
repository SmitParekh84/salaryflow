"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinanceStore } from "@/lib/store";
import {
  ArrowLeft,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRoundPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  emailVerified: boolean;
  createdAt: string;
};

type AdminData = {
  currentUserId: string;
  stats: {
    totalUsers: number;
    adminUsers: number;
    verifiedUsers: number;
    recentUsers: number;
  };
  users: AdminUser[];
};

type UserFilter = "all" | "admin" | "member" | "unverified";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const resetAll = useFinanceStore((state) => state.resetAll);

  /**
   * Ends the console session.
   *
   * The console shares the `sf_session` cookie with the app, so this is the
   * same endpoint the product uses — but it returns to `/admin/login` rather
   * than `/login`. Sending an operator to the app's sign-in would land them in
   * the product instead of the console, which is the distinction the proxy
   * already makes for console paths.
   *
   * `resetAll()` matters even here: the store is hydrated globally, so an
   * operator who also uses the product would otherwise leave their own figures
   * cached in the browser for whoever signs in next.
   */
  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => null);
    resetAll();
    router.replace("/admin/login");
    router.refresh();
  }
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  async function loadUsers(quiet = false) {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
        cache: "no-store",
      });
      const json = await response.json().catch(() => ({}));
      setStatus(response.status);
      if (!response.ok) throw new Error(json?.error || "Unable to load admin data");
      setData(json.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load admin data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const response = await fetch("/api/admin/users", {
          credentials: "include",
          cache: "no-store",
        });
        const json = await response.json().catch(() => ({}));
        if (cancelled) return;
        setStatus(response.status);
        if (!response.ok) throw new Error(json?.error || "Unable to load admin data");
        setData(json.data);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load admin data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleUsers = (data?.users ?? []).filter((user) => {
    const matchesQuery =
      !normalizedQuery ||
      user.email.toLowerCase().includes(normalizedQuery) ||
      user.name?.toLowerCase().includes(normalizedQuery);
    const matchesFilter =
      filter === "all" ||
      (filter === "admin" && user.isAdmin) ||
      (filter === "member" && !user.isAdmin) ||
      (filter === "unverified" && !user.emailVerified);
    return matchesQuery && matchesFilter;
  });

  async function updateRole(user: AdminUser) {
    setActionLoading(user.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isAdmin: !user.isAdmin }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || "Unable to update role");
      await loadUsers(true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update role");
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser() {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.email) return;
    setActionLoading(deleteTarget.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || "Unable to delete account");
      setDeleteTarget(null);
      setDeleteConfirmation("");
      await loadUsers(true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to delete account");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Aartha Admin</p>
              <p className="text-xs text-muted">Access and account operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="secondary" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to app</span>
              </Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={signOut}
              disabled={signingOut}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">
                {signingOut ? "Signing out…" : "Sign out"}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              User administration
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Review account status and manage administrative access. Financial records are never
              displayed here.
            </p>
          </div>
          <Badge variant="success" className="h-7 px-3">
            <Shield className="h-3.5 w-3.5" /> Protected route
          </Badge>
        </div>

        {error && !loading && (
          <div
            role="alert"
            className="mt-5 flex items-start justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            <span>{error}</span>
            {status !== 401 && status !== 403 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void loadUsers()}
                className="-my-2 text-danger"
              >
                Retry
              </Button>
            )}
          </div>
        )}

        {loading ? (
          <AdminSkeleton />
        ) : status === 401 ? (
          <EmptyState
            icon={Shield}
            title="Sign in required"
            description="Your admin session is missing or has expired."
            className="mt-6 bg-surface"
            action={
              <Button asChild>
                <Link href="/login?next=%2Fadmin">Sign in securely</Link>
              </Button>
            }
          />
        ) : status === 403 ? (
          <EmptyState
            icon={Shield}
            title="Admin access required"
            description="This account does not have permission to open the administration console."
            className="mt-6 bg-surface"
            action={
              <Button asChild variant="secondary">
                <Link href="/dashboard">Return to dashboard</Link>
              </Button>
            }
          />
        ) : data ? (
          <>
            <section
              aria-label="Account overview"
              className="mt-6 overflow-hidden rounded-2xl bg-surface card-shadow"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4">
                <Metric label="Total accounts" value={data.stats.totalUsers} icon={Users} />
                <Metric label="Verified" value={data.stats.verifiedUsers} icon={UserCheck} />
                <Metric label="Administrators" value={data.stats.adminUsers} icon={ShieldCheck} />
                <Metric
                  label="New in 30 days"
                  value={data.stats.recentUsers}
                  icon={UserRoundPlus}
                />
              </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl bg-surface card-shadow">
              <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <h2 className="text-base font-semibold">Accounts</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    {visibleUsers.length} of {data.users.length} accounts shown
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search name or email"
                      aria-label="Search users"
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as UserFilter)}
                    aria-label="Filter users"
                    className="sm:w-40"
                  >
                    <option value="all">All accounts</option>
                    <option value="admin">Administrators</option>
                    <option value="member">Members</option>
                    <option value="unverified">Unverified</option>
                  </Select>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => void loadUsers(true)}
                    disabled={refreshing}
                    aria-label="Refresh users"
                    title="Refresh users"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {visibleUsers.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No matching accounts"
                  description="Change the search term or account filter."
                  className="m-4 sm:m-5"
                />
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-190 text-left">
                      <thead className="bg-surface-2/70 text-xs font-medium text-muted">
                        <tr>
                          <th className="px-5 py-3">Account</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Joined</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleUsers.map((user) => (
                          <UserRow
                            key={user.id}
                            user={user}
                            isCurrent={user.id === data.currentUserId}
                            loading={actionLoading === user.id}
                            onRoleChange={() => void updateRole(user)}
                            onDelete={() => {
                              setDeleteTarget(user);
                              setDeleteConfirmation("");
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="divide-y divide-border md:hidden">
                    {visibleUsers.map((user) => (
                      <UserMobileRow
                        key={user.id}
                        user={user}
                        isCurrent={user.id === data.currentUserId}
                        loading={actionLoading === user.id}
                        onRoleChange={() => void updateRole(user)}
                        onDelete={() => {
                          setDeleteTarget(user);
                          setDeleteConfirmation("");
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        ) : null}
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!actionLoading) {
            setDeleteTarget(null);
            setDeleteConfirmation("");
          }
        }}
        title="Delete user account"
      >
        {deleteTarget && (
          <>
            <div className="rounded-xl bg-danger/10 p-4 text-sm text-danger">
              This permanently deletes the account and all owned financial records. This action
              cannot be undone.
            </div>
            <div className="mt-5">
              <Label htmlFor="delete-confirmation">
                Type <span className="font-mono">{deleteTarget.email}</span> to confirm
              </Label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmation("");
                }}
                disabled={Boolean(actionLoading)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => void deleteUser()}
                disabled={deleteConfirmation !== deleteTarget.email || Boolean(actionLoading)}
              >
                <Trash2 className="h-4 w-4" />
                {actionLoading ? "Deleting…" : "Delete permanently"}
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </main>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-r border-border p-4 lg:border-b-0 lg:p-5 lg:last:border-r-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        <p className="truncate text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function UserRow({ user, isCurrent, loading, onRoleChange, onDelete }: UserRowProps) {
  return (
    <tr className="border-t border-border first:border-t-0 hover:bg-surface-2/40">
      <td className="px-5 py-4">
        <UserIdentity user={user} isCurrent={isCurrent} />
      </td>
      <td className="px-4 py-4">
        <VerificationBadge verified={user.emailVerified} />
      </td>
      <td className="px-4 py-4">
        <Badge variant={user.isAdmin ? "default" : "secondary"}>
          {user.isAdmin ? "Administrator" : "Member"}
        </Badge>
      </td>
      <td className="px-4 py-4 text-xs text-muted">{formatDate(user.createdAt)}</td>
      <td className="px-5 py-4">
        <UserActions
          user={user}
          isCurrent={isCurrent}
          loading={loading}
          onRoleChange={onRoleChange}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}

function UserMobileRow({ user, isCurrent, loading, onRoleChange, onDelete }: UserRowProps) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <UserIdentity user={user} isCurrent={isCurrent} />
        <Badge variant={user.isAdmin ? "default" : "secondary"}>
          {user.isAdmin ? "Admin" : "Member"}
        </Badge>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <VerificationBadge verified={user.emailVerified} />
          <span className="truncate text-xs text-muted">{formatDate(user.createdAt)}</span>
        </div>
        <UserActions
          user={user}
          isCurrent={isCurrent}
          loading={loading}
          onRoleChange={onRoleChange}
          onDelete={onDelete}
          compact
        />
      </div>
    </div>
  );
}

type UserRowProps = {
  user: AdminUser;
  isCurrent: boolean;
  loading: boolean;
  onRoleChange: () => void;
  onDelete: () => void;
};

function UserIdentity({ user, isCurrent }: { user: AdminUser; isCurrent: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-sm font-semibold">
        {(user.name || user.email).trim().charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{user.name || "Unnamed user"}</p>
          {isCurrent && <Badge variant="outline">You</Badge>}
        </div>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
    </div>
  );
}

function UserActions({
  user,
  isCurrent,
  loading,
  onRoleChange,
  onDelete,
  compact = false,
}: UserRowProps & { compact?: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <Button
        variant="secondary"
        size={compact ? "icon" : "sm"}
        disabled={loading || isCurrent}
        onClick={onRoleChange}
        aria-label={
          user.isAdmin
            ? `Remove admin access from ${user.email}`
            : `Make ${user.email} an administrator`
        }
        title={
          isCurrent
            ? "You cannot change your own role"
            : user.isAdmin
              ? "Remove admin access"
              : "Make administrator"
        }
      >
        <Shield className="h-4 w-4" />
        {!compact && (loading ? "Updating…" : user.isAdmin ? "Demote" : "Promote")}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={loading || isCurrent}
        onClick={onDelete}
        className="text-danger hover:bg-danger/10"
        aria-label={`Delete ${user.email}`}
        title={isCurrent ? "You cannot delete your own account" : "Delete account"}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function VerificationBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge variant="success">
      <CheckCircle2 className="h-3 w-3" />
      Verified
    </Badge>
  ) : (
    <Badge variant="warning">Unverified</Badge>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : dateFormatter.format(date);
}

function AdminSkeleton() {
  return (
    <div className="mt-6 space-y-6" aria-label="Loading administration data">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="flex items-center gap-3 bg-surface p-5">
            <Skeleton className="h-10 w-10 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-surface p-5">
        <Skeleton className="h-11 w-full" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
