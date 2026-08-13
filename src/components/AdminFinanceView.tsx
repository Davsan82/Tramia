import React, { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  FileCheck2,
  LoaderCircle,
  RefreshCw,
  Star,
  Trash2,
  UsersRound,
} from "lucide-react";
export default function AdminFinanceView() {
  const [tab, setTab] = useState<"reports" | "payments" | "ratings">("reports"),
    [data, setData] = useState<any>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const endpoint =
      tab === "reports"
        ? "/api/v1/admin/reports/overview"
        : tab === "payments"
          ? "/api/v1/admin/payments"
          : "/api/v1/admin/ratings";
    const r = await fetch(endpoint, { credentials: "include" }),
      p = await r.json().catch(() => ({}));
    if (r.ok) setData(p);
    else setError(p.message || "No pudimos cargar la información.");
    setLoading(false);
  }, [tab]);
  useEffect(() => {
    void load();
  }, [load]);
  const removeRating = async (id: string) => {
    const reason = prompt("Motivo de moderación (mínimo 8 caracteres)");
    if (!reason) return;
    const r = await fetch(`/api/v1/admin/ratings/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (r.ok) void load();
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {[
          ["reports", "Indicadores"],
          ["payments", "Pagos simulados"],
          ["ratings", "Calificaciones"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value as any)}
            className={`rounded-xl px-4 py-2 text-xs font-black ${tab === value ? "bg-violet-700 text-white" : "bg-white text-slate-600"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <LoaderCircle className="mx-auto mt-16 animate-spin text-violet-600" />
      ) : error ? (
        <div className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700">
          {error}
          <button onClick={() => void load()}>
            <RefreshCw />
          </button>
        </div>
      ) : tab === "reports" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={CreditCard}
            label="Pagos aprobados"
            value={data.payments?.count || 0}
            detail={`S/ ${((data.payments?.amount || 0) / 100).toFixed(2)}`}
          />
          <Metric
            icon={Star}
            label="Calificaciones"
            value={data.ratings?.count || 0}
            detail={`Promedio ${data.ratings?.average || 0}`}
          />
          <Metric
            icon={UsersRound}
            label="Asesores"
            value={data.advisors?.total || 0}
            detail={`${data.advisors?.available || 0} disponibles`}
          />
          <Metric
            icon={FileCheck2}
            label="Documentos"
            value={data.documents?.total || 0}
            detail={`${data.documents?.pending || 0} pendientes`}
          />
        </div>
      ) : tab === "payments" ? (
        <div className="mt-6 overflow-x-auto rounded-3xl bg-white">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b">
                <th className="p-4">Usuario</th>
                <th>Trámite</th>
                <th>Estado</th>
                <th>Importe</th>
                <th>Referencia</th>
              </tr>
            </thead>
            <tbody>
              {data.payments?.map((x: any) => (
                <tr key={x.id} className="border-b border-slate-100">
                  <td className="p-4 font-black">{x.username}</td>
                  <td>
                    {x.procedureTitle}
                    <small className="block text-slate-400">
                      {x.trackingCode}
                    </small>
                  </td>
                  <td>{x.status}</td>
                  <td>S/ {(x.amountMinor / 100).toFixed(2)}</td>
                  <td>{x.reference || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {data.ratings?.map((x: any) => (
            <article key={x.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <strong className="text-amber-600">
                  {"★".repeat(x.rating)}
                </strong>
                <button
                  onClick={() => void removeRating(x.id)}
                  className="rounded-lg bg-red-50 p-2 text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <p className="mt-2 text-sm">{x.comment || "Sin comentario"}</p>
              <p className="mt-2 text-[10px] text-slate-400">
                {x.trackingCode} · {x.ratingType}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-3xl bg-white p-5 shadow-sm">
      <span className="grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-700">
        <Icon />
      </span>
      <p className="mt-4 text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <strong className="mt-1 block text-3xl">{value}</strong>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}
