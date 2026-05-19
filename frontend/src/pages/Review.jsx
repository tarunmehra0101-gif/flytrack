import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Trash2, RefreshCcw } from "lucide-react";
import Shell from "@/components/shell/Shell";
import BoardingPassCard from "@/components/BoardingPassCard";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const FIELD_LABELS = {
  airline_iata: "Airline code",
  airline_name: "Airline",
  flight_number: "Flight number",
  flight_date: "Flight date",
  departure_time_local: "Takeoff time",
  arrival_time_local: "Landing time",
  departure_airport_iata: "From airport",
  arrival_airport_iata: "To airport",
  seat_number: "Seat",
  terminal_departure: "Departure terminal",
  gate: "Gate",
  booking_reference: "PNR",
  passenger_name: "Passenger",
};

const TIME_FIELDS = new Set(["departure_time_local", "arrival_time_local"]);

export default function Review() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seg, setSeg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/segments/${id}`);
      setSeg(data);
    } catch {
      toast.error("Flight not found");
      navigate("/import", { replace: true });
    }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const setField = (k, v) => setSeg((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(FIELD_LABELS).map(([k]) => [k, seg?.[k] ?? null]));
      await api.patch(`/segments/${id}`, payload);
      const { data } = await api.post(`/segments/${id}/confirm`);
      toast.success(data.duplicate ? "Looks like this flight is already in your Flight Timeline." : "Added to your Flight Timeline");
      navigate("/timeline");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Couldn't save");
    } finally { setSaving(false); }
  };

  const reject = async () => {
    try {
      await api.delete(`/segments/${id}`);
      toast.success("Removed");
      navigate("/import");
    } catch { toast.error("Couldn't remove segment"); }
  };

  return (
    <Shell
      title="Review Flight"
      leading={
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center" data-testid="review-back">
          <ArrowLeft size={16} />
        </button>
      }
    >
      <div className="p-4 pb-10 flex flex-col gap-5 animate-fade-up" data-testid="review-page">
        {loading ? (
          <div className="h-48 tl-card animate-pulse" />
        ) : seg ? (
          <>
            <BoardingPassCard flight={seg} />

            {(seg.confidence_score < 0.8 || (seg.missing_fields || []).length > 0) && (
              <div className="tl-card p-3 border-amber-500/40 bg-amber-500/5 flex gap-3 items-start text-xs" data-testid="low-conf-banner">
                <RefreshCcw size={14} className="text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-500">A couple of fields need a second look</p>
                  <p className="text-muted-foreground mt-0.5">
                    {seg.parse_message || "We weren't 100% sure on everything — a quick edit keeps your Flight Timeline clean."}
                  </p>
                  {(seg.missing_fields || []).length > 0 && (
                    <p className="text-muted-foreground mt-1">Missing: {seg.missing_fields.join(", ").replaceAll("_", " ")}</p>
                  )}
                </div>
              </div>
            )}

            <div className="tl-card tl-card-intense p-4 flex flex-col gap-4" data-testid="edit-fields">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Check the details before saving</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(FIELD_LABELS).map(([k, label]) => (
                  <label key={k} className="flex flex-col gap-1 col-span-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                    <Input
                      data-testid={`field-${k}`}
                      type={k === "flight_date" ? "date" : TIME_FIELDS.has(k) ? "time" : "text"}
                      value={seg[k] ?? ""}
                      onChange={(e) => setField(k, e.target.value)}
                      className="h-9 text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 sticky bottom-2">
              <button
                onClick={reject}
                className="flex-1 py-3 rounded-full border border-border hover:border-destructive hover:text-destructive transition font-medium text-sm flex items-center justify-center gap-1.5"
                data-testid="reject-btn"
              >
                <Trash2 size={14} /> Discard
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-[2] tl-btn-primary flex items-center justify-center gap-2"
                data-testid="confirm-save-btn"
              >
                <Check size={14} /> {saving ? "Saving…" : "Save to Flight Timeline"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </Shell>
  );
}
