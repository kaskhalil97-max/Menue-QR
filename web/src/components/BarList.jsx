// Liste à barres horizontales pour une seule mesure classée (magnitude), teinte
// unique de la marque — jamais une couleur par barre (ce ne sont pas des séries).
export default function BarList({ data, valueFormatter = (v) => v, emptyLabel = "—" }) {
  if (data.length === 0) {
    return <p className="text-olive-500">{emptyLabel}</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div dir="ltr" className="space-y-3">
      {data.map((d) => {
        const pct = Math.max(4, Math.round((d.value / max) * 100));
        return (
          <div key={d.label} className="group">
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-olive-700">{d.label}</span>
              <span className="tabular-nums font-semibold text-olive-900">{valueFormatter(d.value)}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-sand-100 transition-colors group-hover:bg-sand-200">
              <div
                className="h-3 rounded-full bg-olive-600 transition-all group-hover:bg-olive-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
