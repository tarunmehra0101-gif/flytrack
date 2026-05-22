import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Trash2, RefreshCcw } from "lucide-react";
import Shell from "@/components/shell/Shell";
import BoardingPassCard from "@/components/BoardingPassCard";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { FlightLoadingAnimation } from "@/components/ui/AnimatedIcons";

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

  const save = async () => {
    setSaving(true);
    try {
      // Patch the updated segment details directly
      await api.patch(`/segments/${id}`, seg);
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
          <div className="h-64 flex flex-col items-center justify-center bg-card/10 backdrop-blur rounded-[28px] border border-border/40">
            <FlightLoadingAnimation size={110} />
          </div>
        ) : seg ? (
          <>
            {/* Gamified direct inline card editing */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold text-center mb-1">
                Tap or click any field inside the ticket to edit
              </p>
              <BoardingPassCard flight={seg} isEditable={true} onChange={setSeg} />
            </div>

            {(seg.confidence_score < 0.8 || (seg.missing_fields || []).length > 0) && (
              <div className="tl-card p-3 border-amber-500/40 bg-amber-500/5 flex gap-3 items-start text-xs rounded-2xl" data-testid="low-conf-banner">
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

            <div className="flex gap-2 sticky bottom-2 pt-2 bg-background/80 backdrop-blur-sm z-10">
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

