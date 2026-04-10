import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const API = "http://localhost:8000";
const fmt = (n?: number | null): string => (n ?? 0).toLocaleString("id-ID");

// ── Types ──────────────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill?: string }>;
  label?: string;
}

type AccentKey = "gray" | "red" | "green" | "blue" | "amber";

interface TimelineEntry {
  day: string;
  attacks: number;
  normals: number;
}

interface Stats {
  total: number;
  total_attack: number;
  total_normal: number;
  total_labeled: number;
  labeled_normal: number;
  labeled_attack: number;
  corrections: number;
  timeline: TimelineEntry[];
}

interface PredictionItem {
  id: string;
  created_at: string;
  ip: string;
  method: string;
  path: string;
  prediction: "Attack" | "Normal";
  label: "Attack" | "Normal" | null;
}

interface PredictionsResponse {
  total: number;
  items: PredictionItem[];
}

interface ChartEntry {
  day: string;
  Attack: number;
  Normal: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function useDateRange() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState<string>(weekAgo);
  const [to, setTo] = useState<string>(today);
  return { from, to, setFrom, setTo };
}

const ACCENTS: Record<AccentKey, { bg: string; color: string; border: string }> = {
  gray:  { bg: "#F9FAFB", color: "#374151", border: "#E5E7EB" },
  red:   { bg: "#FCEBEB", color: "#A32D2D", border: "#F7C1C1" },
  green: { bg: "#EAF3DE", color: "#3B6D11", border: "#C0DD97" },
  blue:  { bg: "#E6F1FB", color: "#185FA5", border: "#B5D4F4" },
  amber: { bg: "#FAEEDA", color: "#854F0B", border: "#FAC775" },
};

// ── Sub-components ─────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  accent: AccentKey;
}

function StatCard({ label, value, accent }: StatCardProps) {
  const a = ACCENTS[accent];
  return (
    <div
      style={{
        background: a.bg,
        borderRadius: 12,
        border: `1px solid ${a.border}`,
        padding: "16px 18px",
        minWidth: 0,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: a.color,
          opacity: 0.7,
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 26,
          fontWeight: 700,
          color: a.color,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

interface BadgeProps {
  value: string;
}

function Badge({ value }: BadgeProps) {
  const isAtk = value === "Attack";
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 999,
        background: isAtk ? "#FCEBEB" : "#EAF3DE",
        color: isAtk ? "#A32D2D" : "#3B6D11",
        letterSpacing: "0.03em",
      }}
    >
      {value}
    </span>
  );
}

interface ThumbButtonProps {
  icon: string;
  active: boolean;
  title: string;
  onClick: () => void;
}

function ThumbButton({ icon, active, title, onClick }: ThumbButtonProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        border: "none",
        background: "none",
        cursor: "pointer",
        fontSize: 16,
        opacity: active ? 1 : 0.22,
        transform: active ? "scale(1.2)" : "scale(1)",
        transition: "opacity 0.15s, transform 0.1s",
        padding: "2px 5px",
        borderRadius: 5,
      }}
    >
      {icon}
    </button>
  );
}

interface PredictionRowProps {
  item: PredictionItem;
  onLabel: (id: string, label: "Attack" | "Normal" | null) => void;
}

function PredictionRow({ item, onLabel }: PredictionRowProps) {
  const labeledNorm = item.label === "Normal";
  const labeledAtk = item.label === "Attack";
  const time = item.created_at
    ? item.created_at.slice(0, 16).replace("T", " ")
    : "—";

  return (
    <tr
      style={{ borderBottom: "1px solid #F3F4F6" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement)
          .querySelectorAll("td")
          .forEach((td) => ((td as HTMLElement).style.background = "#F9FAFB"));
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement)
          .querySelectorAll("td")
          .forEach((td) => ((td as HTMLElement).style.background = ""));
      }}
    >
      <td style={{ padding: "9px 12px", color: "#9CA3AF", whiteSpace: "nowrap", fontSize: 12 }}>
        {time}
      </td>
      <td style={{ padding: "9px 12px", fontFamily: "monospace", color: "#374151", fontSize: 12 }}>
        {item.ip || "—"}
      </td>
      <td style={{ padding: "9px 12px", fontSize: 12 }}>
        <span style={{ fontWeight: 600, color: "#111827" }}>{item.method || ""}</span>{" "}
        <span style={{ color: "#6B7280", wordBreak: "break-all", fontSize: 11 }}>
          {item.path || ""}
        </span>
      </td>
      <td style={{ padding: "9px 12px", textAlign: "center" }}>
        <Badge value={item.prediction ?? "—"} />
      </td>
      <td style={{ padding: "9px 12px", textAlign: "center" }}>
        {item.label ? (
          <Badge value={item.label} />
        ) : (
          <span style={{ color: "#D1D5DB" }}>—</span>
        )}
      </td>
      <td style={{ padding: "9px 12px", textAlign: "center", whiteSpace: "nowrap" }}>
        <ThumbButton
          icon="👍"
          active={labeledNorm}
          title="Tandai Normal"
          onClick={() => onLabel(item.id, labeledNorm ? null : "Normal")}
        />
        <ThumbButton
          icon="👎"
          active={labeledAtk}
          title="Tandai Attack"
          onClick={() => onLabel(item.id, labeledAtk ? null : "Attack")}
        />
      </td>
    </tr>
  );
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#1E293B",
        border: "1px solid #334155",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: "#F1F5F9",
      }}
    >
      <p style={{ margin: "0 0 4px", fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ margin: "2px 0", color: p.fill as string }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const { from, to, setFrom, setTo } = useDateRange();
  const [stats, setStats] = useState<Stats | null>(null);
  const [preds, setPreds] = useState<PredictionsResponse | null>(null);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (pg: number = 1) => {
      setLoading(true);
      setError(null);
      try {
        const qs = `date_from=${from}&date_to=${to}`;
        const [s, p] = await Promise.all([
          fetch(`${API}/api/stats?${qs}`).then((r) => r.json() as Promise<Stats>),
          fetch(`${API}/api/predictions?${qs}&page=${pg}&page_size=30`).then(
            (r) => r.json() as Promise<PredictionsResponse>
          ),
        ]);
        setStats(s);
        setPreds(p);
        setPage(pg);
      } catch {
        setError(
          "Tidak bisa terhubung ke API. Pastikan server berjalan di port 8000."
        );
      } finally {
        setLoading(false);
      }
    },
    [from, to]
  );

  useEffect(() => {
    fetchAll(1);
  }, [fetchAll]);

  const handleLabel = async (
    id: string,
    label: "Attack" | "Normal" | null
  ): Promise<void> => {
    const body = label === null ? { label: "Normal" } : { label };
    try {
      await fetch(`${API}/api/predictions/${id}/label`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // silent — optimistic update already applied
    }

    setPreds((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((it) =>
              it.id === id ? { ...it, label: it.label === label ? null : label } : it
            ),
          }
        : prev
    );

    const qs = `date_from=${from}&date_to=${to}`;
    fetch(`${API}/api/stats?${qs}`)
      .then((r) => r.json() as Promise<Stats>)
      .then(setStats)
      .catch(() => {});
  };

  const correctionRate: string =
    stats && stats.total_labeled > 0
      ? ((stats.corrections / stats.total_labeled) * 100).toFixed(1) + "%"
      : "—";

  const totalPages: number = preds ? Math.ceil(preds.total / 30) : 1;

  const progressPct: number =
    stats && stats.total > 0
      ? Math.min((stats.total_labeled / stats.total) * 100, 100)
      : 0;

  const chartData: ChartEntry[] = (stats?.timeline ?? []).map((d) => ({
    day: d.day?.slice(5) ?? "",
    Attack: d.attacks ?? 0,
    Normal: d.normals ?? 0,
  }));

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Mono', 'Fira Code', 'Courier New', monospace",
        minHeight: "100vh",
        background: "#F8FAFC",
        color: "#111827",
      }}
    >
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          background: "#0F172A",
          color: "#F1F5F9",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22C55E",
              boxShadow: "0 0 0 3px rgba(34,197,94,.25)",
              animation: "pulse 2s infinite",
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.06em" }}>
            ATTACK DETECTION
          </span>
          <span style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.08em" }}>
            SECURITY DASHBOARD
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>Rentang tanggal:</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid #334155",
              background: "#1E293B",
              color: "#F1F5F9",
              outline: "none",
              cursor: "pointer",
            }}
          />
          <span style={{ color: "#64748B", fontSize: 12 }}>→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid #334155",
              background: "#1E293B",
              color: "#F1F5F9",
              outline: "none",
              cursor: "pointer",
            }}
          />
          <button
            onClick={() => fetchAll(1)}
            disabled={loading}
            style={{
              fontSize: 12,
              padding: "5px 14px",
              borderRadius: 6,
              border: "1px solid #22C55E",
              background: loading ? "#1E293B" : "#22C55E",
              color: loading ? "#94A3B8" : "#0F172A",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all .15s",
            }}
          >
            {loading ? "..." : "Terapkan"}
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Error banner */}
        {error && (
          <div
            style={{
              background: "#FCEBEB",
              border: "1px solid #F7C1C1",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 20,
              color: "#A32D2D",
              fontSize: 12,
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <StatCard label="Total Request" value={stats ? fmt(stats.total) : "—"} accent="gray" />
          <StatCard label="Terdeteksi Attack" value={stats ? fmt(stats.total_attack) : "—"} accent="red" />
          <StatCard label="Traffic Normal" value={stats ? fmt(stats.total_normal) : "—"} accent="green" />
          <StatCard label="Sudah Dilabeli" value={stats ? fmt(stats.total_labeled) : "—"} accent="blue" />
          <StatCard label="Koreksi Model" value={correctionRate} accent="amber" />
        </div>

        {/* ── Charts row ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {/* Timeline */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #E5E7EB",
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 12, color: "#374151", letterSpacing: "0.05em" }}>
                TRAFFIC TIMELINE
              </span>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#6B7280" }}>
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: "#E24B4A",
                      marginRight: 4,
                    }}
                  />
                  Attack
                </span>
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: "#639922",
                      marginRight: 4,
                    }}
                  />
                  Normal
                </span>
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="#F3F4F6" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Attack" fill="#E24B4A" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Normal" fill="#639922" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: 160,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9CA3AF",
                  fontSize: 13,
                }}
              >
                Tidak ada data timeline
              </div>
            )}
          </div>

          {/* Labeling Progress */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #E5E7EB",
              padding: "16px 18px",
            }}
          >
            <p
              style={{
                margin: "0 0 14px",
                fontWeight: 700,
                fontSize: 12,
                color: "#374151",
                letterSpacing: "0.05em",
              }}
            >
              PROGRESS LABELING
            </p>
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#6B7280",
                  marginBottom: 5,
                }}
              >
                <span>Labeled</span>
                <span>
                  {fmt(stats?.total_labeled)} / {fmt(stats?.total)}
                </span>
              </div>
              <div
                style={{
                  background: "#F3F4F6",
                  borderRadius: 999,
                  height: 7,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: 7,
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #3B82F6, #8B5CF6)",
                    width: `${progressPct.toFixed(1)}%`,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#6B7280",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>👍 Dilabeli Normal</span>
                <span style={{ fontWeight: 600 }}>{fmt(stats?.labeled_normal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>👎 Dilabeli Attack</span>
                <span style={{ fontWeight: 600 }}>{fmt(stats?.labeled_attack)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#D97706",
                }}
              >
                <span>⚠ Koreksi (salah prediksi)</span>
                <span style={{ fontWeight: 600 }}>{fmt(stats?.corrections)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #E5E7EB",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid #F3F4F6",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: "#374151", letterSpacing: "0.05em" }}>
              LOG PREDIKSI{" "}
              {preds && (
                <span style={{ fontWeight: 400, color: "#9CA3AF", fontSize: 11 }}>
                  ({fmt(preds.total)} total)
                </span>
              )}
            </p>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>
              👍 = Normal &nbsp;|&nbsp; 👎 = Attack &nbsp;· klik untuk relabeling
            </span>
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 13 }}>
              Memuat data...
            </div>
          )}

          {!loading && preds && preds.items.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                    {["Waktu", "IP", "Method / Path", "Prediksi Model", "Label Admin", "Aksi"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: "9px 12px",
                            textAlign: "left",
                            fontWeight: 600,
                            fontSize: 11,
                            color: "#6B7280",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {preds.items.map((item) => (
                    <PredictionRow key={item.id} item={item} onLabel={handleLabel} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && preds && preds.items.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF", fontSize: 13 }}>
              Tidak ada data untuk rentang tanggal ini.
            </div>
          )}

          {/* Pagination */}
          {preds && totalPages > 1 && (
            <div
              style={{
                padding: "10px 18px",
                borderTop: "1px solid #F3F4F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <button
                onClick={() => fetchAll(page - 1)}
                disabled={page <= 1 || loading}
                style={{
                  fontSize: 12,
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "1px solid #E5E7EB",
                  background: "none",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  color: "#374151",
                  opacity: page <= 1 ? 0.4 : 1,
                }}
              >
                ← Prev
              </button>
              <span style={{ fontSize: 12, color: "#6B7280" }}>
                Halaman {page} / {totalPages}
              </span>
              <button
                onClick={() => fetchAll(page + 1)}
                disabled={page >= totalPages || loading}
                style={{
                  fontSize: 12,
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "1px solid #E5E7EB",
                  background: "none",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  color: "#374151",
                  opacity: page >= totalPages ? 0.4 : 1,
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 18,
            fontSize: 10,
            color: "#CBD5E1",
            letterSpacing: "0.07em",
          }}
        >
          ATTACK DETECTION DASHBOARD · DATA DIGUNAKAN UNTUK RETRAIN MODEL
        </p>
      </div>
    </div>
  );
}