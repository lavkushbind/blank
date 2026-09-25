"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  IndianRupee,
  Loader2,
  RefreshCw,
  WalletCards,
} from "lucide-react";

import { auth, db } from "@/lib/firebase/client";

type LedgerEntry = {
  id: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  createdAt: any;
  sessionId?: string;
  batchId?: string;
};

type Payout = {
  id: string;
  amount: number;
  status: string;
  createdAt: any;
  processedAt?: any;
  reference?: string;
};

export default function TeacherWalletPage() {
  const [uid, setUid] = useState<string | null>(null);

  const [ledger, setLedger] =
    useState<LedgerEntry[]>([]);

  const [payouts, setPayouts] =
    useState<Payout[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            setLoading(false);
            return;
          }

          setUid(user.uid);
          await loadWallet(
            user.uid,
            true
          );
        }
      );

    return () => unsubscribe();
  }, []);

  async function loadWallet(
    teacherUid: string,
    initial = false
  ) {
    if (initial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      /*
       * Ledger
       *
       * Primary production collection:
       * teacher_ledger
       */
      const ledgerQuery = query(
        collection(db, "teacher_ledger"),
        where(
          "teacherId",
          "==",
          teacherUid
        ),
        limit(200)
      );

      const ledgerSnap =
        await getDocs(ledgerQuery);

      const ledgerList: LedgerEntry[] =
        ledgerSnap.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            amount:
              typeof data.amount === "number"
                ? data.amount
                : 0,
            type:
              data.type ||
              "EARNING",
            status:
              data.status ||
              "POSTED",
            description:
              data.description ||
              "Teacher earning",
            createdAt:
              data.createdAt ||
              data.timestamp ||
              null,
            sessionId:
              data.sessionId ||
              undefined,
            batchId:
              data.batchId ||
              undefined,
          };
        });

      ledgerList.sort(
        (a, b) =>
          getTimestamp(b.createdAt) -
          getTimestamp(a.createdAt)
      );

      setLedger(ledgerList);

      /*
       * Payouts
       */
      try {
        const payoutQuery = query(
          collection(db, "teacher_payouts"),
          where(
            "teacherId",
            "==",
            teacherUid
          ),
          limit(100)
        );

        const payoutSnap =
          await getDocs(payoutQuery);

        const payoutList: Payout[] =
          payoutSnap.docs.map((item) => {
            const data = item.data();

            return {
              id: item.id,
              amount:
                typeof data.amount ===
                "number"
                  ? data.amount
                  : 0,
              status:
                data.status ||
                "PENDING",
              createdAt:
                data.createdAt ||
                data.requestedAt ||
                null,
              processedAt:
                data.processedAt ||
                null,
              reference:
                data.reference ||
                data.utr ||
                undefined,
            };
          });

        payoutList.sort(
          (a, b) =>
            getTimestamp(
              b.createdAt
            ) -
            getTimestamp(
              a.createdAt
            )
        );

        setPayouts(payoutList);
      } catch (payoutError) {
        console.error(
          "Payout loading error:",
          payoutError
        );

        setPayouts([]);
      }
    } catch (err) {
      console.error(
        "Teacher wallet error:",
        err
      );

      setError(
        "Unable to load wallet data."
      );

      setLedger([]);
      setPayouts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const postedEarnings = useMemo(() => {
    return ledger
      .filter((entry) =>
        isPositiveEntry(entry)
      )
      .reduce(
        (total, entry) =>
          total + entry.amount,
        0
      );
  }, [ledger]);

  const pendingEarnings = useMemo(() => {
    return ledger
      .filter(
        (entry) =>
          isPositiveEntry(entry) &&
          entry.status === "PENDING"
      )
      .reduce(
        (total, entry) =>
          total + entry.amount,
        0
      );
  }, [ledger]);

  const completedPayouts = useMemo(() => {
    return payouts
      .filter(
        (payout) =>
          payout.status === "PAID" ||
          payout.status === "COMPLETED" ||
          payout.status === "PROCESSED"
      )
      .reduce(
        (total, payout) =>
          total + payout.amount,
        0
      );
  }, [payouts]);

  const balance = Math.max(
    postedEarnings -
      completedPayouts,
    0
  );

  if (loading) {
    return (
      <PageState>
        <Loader2
          size={30}
          className="animate-spin text-blue-600"
        />

        <p className="mt-3 text-sm text-slate-500">
          Loading wallet...
        </p>
      </PageState>
    );
  }

  if (!uid) {
    return (
      <PageState>
        <WalletCards
          size={40}
          className="text-slate-300"
        />

        <h1 className="mt-4 text-xl font-black text-slate-950">
          Teacher login required
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Please login to access your wallet.
        </p>

        <Link
          href="/teacher-auth"
          className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
        >
          Teacher Login
        </Link>
      </PageState>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft size={17} />
            </Link>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                Teacher Portal
              </p>

              <h1 className="text-lg font-black text-slate-950">
                Wallet
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              uid && loadWallet(uid)
            }
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            <span className="hidden sm:block">
              Refresh
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Wallet overview */}
        <section className="rounded-[28px] bg-slate-950 p-6 text-white shadow-xl sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Available Balance
          </p>

          {ledger.length > 0 ? (
            <h2 className="mt-2 flex items-center gap-1 text-3xl font-black">
              <IndianRupee size={25} />
              {formatMoney(balance)}
            </h2>
          ) : (
            <h2 className="mt-2 text-3xl font-black">
              —
            </h2>
          )}

          <p className="mt-2 max-w-lg text-xs leading-5 text-slate-400">
            Balance is calculated from posted teacher ledger
            entries and completed payouts.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <WalletMetric
              label="Posted Earnings"
              value={
                ledger.length > 0
                  ? formatMoney(
                      postedEarnings
                    )
                  : "—"
              }
            />

            <WalletMetric
              label="Pending Earnings"
              value={
                ledger.length > 0
                  ? formatMoney(
                      pendingEarnings
                    )
                  : "—"
              }
            />

            <WalletMetric
              label="Paid Out"
              value={
                payouts.length > 0
                  ? formatMoney(
                      completedPayouts
                    )
                  : "—"
              }
            />
          </div>
        </section>

        {/* Ledger */}
        <section className="mt-6 rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-base font-black text-slate-950">
              Earnings Ledger
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Earnings recorded for your teaching sessions.
            </p>
          </div>

          {ledger.length === 0 ? (
            <EmptyWallet
              title="No earnings recorded"
              description="Teacher earnings will appear here once a valid ledger entry is created."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {ledger.map((entry) => (
                <LedgerRow
                  key={entry.id}
                  entry={entry}
                />
              ))}
            </div>
          )}
        </section>

        {/* Payouts */}
        <section className="mt-6 rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-base font-black text-slate-950">
              Payout History
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Completed and pending payout records.
            </p>
          </div>

          {payouts.length === 0 ? (
            <EmptyWallet
              title="No payout records"
              description="Payouts will appear here when they are processed."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {payouts.map((payout) => (
                <PayoutRow
                  key={payout.id}
                  payout={payout}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function WalletMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] font-bold text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-white">
        {value}
      </p>
    </div>
  );
}

function LedgerRow({
  entry,
}: {
  entry: LedgerEntry;
}) {
  const positive =
    isPositiveEntry(entry);

  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            positive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          <IndianRupee size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-black text-slate-800">
            {entry.description}
          </p>

          <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">
            <span>
              {formatDate(
                entry.createdAt
              )}
            </span>

            <span>
              {formatStatus(
                entry.status
              )}
            </span>

            {entry.sessionId && (
              <span>
                Session:{" "}
                {entry.sessionId}
              </span>
            )}
          </div>
        </div>
      </div>

      <p
        className={`shrink-0 text-sm font-black ${
          positive
            ? "text-emerald-600"
            : "text-red-600"
        }`}
      >
        {positive ? "+" : "-"}₹
        {formatMoney(
          entry.amount
        )}
      </p>
    </div>
  );
}

function PayoutRow({
  payout,
}: {
  payout: Payout;
}) {
  const paid =
    payout.status === "PAID" ||
    payout.status === "COMPLETED" ||
    payout.status === "PROCESSED";

  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            paid
              ? "bg-emerald-50 text-emerald-600"
              : "bg-amber-50 text-amber-600"
          }`}
        >
          {paid ? (
            <CheckCircle2 size={18} />
          ) : (
            <Clock3 size={18} />
          )}
        </div>

        <div>
          <p className="text-sm font-black text-slate-800">
            Payout
          </p>

          <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">
            <span>
              {formatDate(
                payout.createdAt
              )}
            </span>

            <span>
              {formatStatus(
                payout.status
              )}
            </span>

            {payout.reference && (
              <span>
                Ref:{" "}
                {payout.reference}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm font-black text-slate-900">
        ₹{formatMoney(payout.amount)}
      </p>
    </div>
  );
}

function EmptyWallet({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <WalletCards size={24} />
      </div>

      <p className="mt-3 text-sm font-black text-slate-700">
        {title}
      </p>

      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function PageState({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      {children}
    </div>
  );
}

function isPositiveEntry(
  entry: LedgerEntry
) {
  const type =
    entry.type.toUpperCase();

  return (
    type === "EARNING" ||
    type === "CREDIT" ||
    type === "CLASS_EARNING" ||
    type === "BONUS"
  );
}

function formatMoney(
  amount: number
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  ).format(amount);
}

function formatStatus(
  status: string
) {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getTimestamp(
  value: any
): number {
  if (!value) return 0;

  try {
    if (
      typeof value.toMillis ===
      "function"
    ) {
      return value.toMillis();
    }

    if (
      typeof value.toDate ===
      "function"
    ) {
      return value.toDate().getTime();
    }

    const date = new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? 0
      : date.getTime();
  } catch {
    return 0;
  }
}

function formatDate(
  value: any
) {
  const timestamp =
    getTimestamp(value);

  if (!timestamp) {
    return "Date unavailable";
  }

  return new Date(
    timestamp
  ).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}