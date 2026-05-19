import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";

/**
 * Autocomplete combobox that queries `/api/airports` or `/api/airlines`.
 * - kind: "airport" | "airline"
 * - value: selected object OR string IATA
 * - onSelect(item): called with selected {iata, name, city?}
 */
export default function Autocomplete({
  kind = "airport",
  value,
  onSelect,
  placeholder,
  testId,
  autoFocus = false,
  renderItem,
}) {
  const [query, setQuery] = useState(
    typeof value === "string" ? value : value?.iata || ""
  );
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  const endpoint = kind === "airport" ? "/airports" : "/airlines";

  const runSearch = async (q) => {
    setLoading(true);
    try {
      const { data } = await api.get(endpoint, { params: { q, limit: 8 } });
      setItems(data || []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 180);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelect = (item) => {
    onSelect(item);
    setQuery(kind === "airport" ? `${item.city} (${item.iata})` : `${item.name} (${item.iata})`);
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapRef} data-testid={testId}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onFocus={() => { setOpen(true); if (!items.length) runSearch(""); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          placeholder={placeholder || (kind === "airport" ? "Search city or IATA…" : "Search airline…")}
          className="pl-9"
          autoFocus={autoFocus}
          data-testid={testId ? `${testId}-input` : undefined}
        />
      </div>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-2 tl-card max-h-72 overflow-y-auto shadow-lg" data-testid={testId ? `${testId}-popover` : undefined}>
          {loading && (
            <div className="p-3 text-xs text-muted-foreground text-center">Looking up…</div>
          )}
          {!loading && items.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground text-center">No matches. Keep typing…</div>
          )}
          {items.map((item) => (
            <button
              key={item.iata}
              onClick={() => handleSelect(item)}
              className="w-full text-left p-3 flex items-center gap-3 hover:bg-secondary/70 transition border-b border-border/50 last:border-0"
              data-testid={testId ? `${testId}-opt-${item.iata}` : undefined}
            >
              {renderItem ? (
                renderItem(item)
              ) : kind === "airport" ? (
                <>
                  <span className="tl-iata-pill !text-xs">{item.iata}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.city}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.name} · {item.country}</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="tl-iata-pill !text-xs">{item.iata}</span>
                  <p className="text-sm font-medium truncate">{item.name}</p>
                </>
              )}
              {(value?.iata === item.iata) && <Check size={14} className="ml-auto text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
