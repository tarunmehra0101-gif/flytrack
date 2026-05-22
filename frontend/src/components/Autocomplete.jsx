import React, { useEffect, useRef, useState } from "react";
import { Check, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";

/**
 * Autocomplete combobox that queries `/api/airports`, `/api/airlines`, or `/api/flights/search`.
 * - kind: "airport" | "airline" | "flight"
 * - value: selected object OR string IATA/flight number
 * - onSelect(item): called with selected object
 * - onTextChange(text): called when raw input text is typed
 * - extraParams: additional query params (e.g. airline_iata)
 */
export default function Autocomplete({
  kind = "airport",
  value,
  onSelect,
  placeholder,
  testId,
  autoFocus = false,
  renderItem,
  onTextChange,
  extraParams,
}) {
  const getDisplayValue = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (kind === "airport") return `${val.city} (${val.iata})`;
    if (kind === "airline") return `${val.name} (${val.iata})`;
    if (kind === "flight") return val.flight_number || val.number || val.iata || "";
    return "";
  };

  const getIdentifier = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    return val.iata || val.flight_number || val.number || "";
  };

  const [query, setQuery] = useState(getDisplayValue(value));
  const [prevValue, setPrevValue] = useState(value);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  const currentId = getIdentifier(value);
  const prevId = getIdentifier(prevValue);

  if (currentId !== prevId) {
    setPrevValue(value);
    setQuery(getDisplayValue(value));
  }

  const endpoint = kind === "airport"
    ? "/airports"
    : kind === "airline"
    ? "/airlines"
    : "/flights/search";

  const runSearch = async (q) => {
    setLoading(true);
    try {
      const params = { q, limit: 8, ...extraParams };
      const { data } = await api.get(endpoint, { params });
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
    setQuery(getDisplayValue(item));
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapRef} data-testid={testId}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onFocus={() => { setOpen(true); runSearch(query); }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (onTextChange) onTextChange(e.target.value);
          }}
          placeholder={placeholder || (
            kind === "airport" ? "Search city or IATA…" :
            kind === "airline" ? "Search airline…" :
            "Search flight number…"
          )}
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
          {items.map((item) => {
            const itemKey = item.id || item.flight_number || item.iata;
            const isSelected = value && (
              value.iata === item.iata ||
              value.flight_number === item.flight_number ||
              (typeof value === "string" && (value === item.iata || value === item.flight_number))
            );
            return (
              <button
                key={itemKey}
                onClick={() => handleSelect(item)}
                className="w-full text-left p-3 flex items-center gap-3 hover:bg-secondary/70 transition border-b border-border/50 last:border-0"
                data-testid={testId ? `${testId}-opt-${itemKey}` : undefined}
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
                ) : kind === "airline" ? (
                  <>
                    <span className="tl-iata-pill !text-xs">{item.iata}</span>
                    <p className="text-sm font-medium truncate">{item.name}</p>
                  </>
                ) : (
                  <>
                    <span className="tl-iata-pill !text-xs">{item.airline_iata}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.flight_number || `${item.airline_iata}${item.number}`}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.departure_airport_iata} → {item.arrival_airport_iata}
                        {item.local_departure_time ? ` · ${item.local_departure_time}` : ""}
                      </p>
                    </div>
                  </>
                )}
                {isSelected && <Check size={14} className="ml-auto text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
