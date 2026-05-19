import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock4, Cloud, Globe2, Home as HomeIcon, MapPin, Plane, Share2, Sparkles, Trophy } from "lucide-react";
import Shell from "@/components/shell/Shell";
import CountUp from "@/components/CountUp";
import { api } from "@/lib/api";
import { toast } from "sonner";

const currentYear = new Date().getFullYear();

function Stat({ label, value, suffix = "", icon: Icon, decimals = 0, raw, iconClass = "" }) {
  return (
    <div className="tl-card p-4 h-28 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <Icon size={14} className={iconClass || "text-muted-foreground"} />
      </div>
      <p className="text-3xl tl-number">
        {raw || <CountUp value={value || 0} decimals={decimals} suffix={suffix} />}
      </p>
    </div>
  );
}

export default function Wrapped() {
  const navigate = useNavigate();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/wrapped", { params: { year } })
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year]);

  const years = useMemo(() => [currentYear, currentYear - 1, currentYear - 2], []);
  const cards = data?.wrapped_cards || [];
  const personalityCopy = {
    "Hub Hopper": "You made a few airports feel like your personal commute. Frequent short hops, repeat routes, and a very recognizable travel rhythm.",
    "Long-haul Minimalist": "Fewer flights, bigger jumps. Your year was shaped by distance more than frequency.",
    "Weekend Nomad": "Short bursts, quick resets, and city switches packed into tight windows.",
  };
  const shareWrapped = async () => {
    if (!data?.total_flights) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, "#060a14");
    gradient.addColorStop(0.45, "#b45309");
    gradient.addColorStop(1, "#060a14");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 18; i += 1) {
      ctx.beginPath();
      ctx.arc(120 + i * 58, 520 + Math.sin(i) * 80, 220, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#f5a623";
    ctx.font = "700 54px system-ui, sans-serif";
    ctx.fillText("RYOKO", 72, 140);
    ctx.fillStyle = "#ffffff";
    ctx.font = "300 92px system-ui, sans-serif";
    ctx.fillText(`${year} Wrapped`, 72, 300);
    ctx.font = "700 124px system-ui, sans-serif";
    ctx.fillText(`${data.total_flights}`, 72, 570);
    ctx.font = "500 44px system-ui, sans-serif";
    ctx.fillText("flights logged", 72, 640);
    ctx.font = "700 88px system-ui, sans-serif";
    ctx.fillText(data.travel_personality || "Traveler", 72, 850);
    ctx.font = "400 42px system-ui, sans-serif";
    ctx.fillText(`${Math.round(data.total_air_hours)} air hours`, 72, 1030);
    ctx.fillText(`${data.top_route || "No top route yet"}`, 72, 1110);
    ctx.fillText(`${data.top_airport || "—"} top airport`, 72, 1190);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "400 34px system-ui, sans-serif";
    ctx.fillText("Private travel ledger · generated on device", 72, 1780);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `ryoko-${year}-wrapped.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `My ${year} Ryoko Wrapped` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Wrapped image saved");
      }
    }, "image/png");
  };

  return (
    <Shell title={`${year} Wrapped`}>
      <div className="p-4 pb-10 flex flex-col gap-5 animate-fade-up" data-testid="wrapped-page">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition ${
                year === y ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/60 text-foreground border-border"
              }`}
              data-testid={`wrapped-year-${y}`}
            >
              {y}
            </button>
          ))}
        </div>

        <div className="tl-card p-5 relative overflow-hidden" data-testid="wrapped-hero">
          <div className="tl-radar-grid absolute inset-0 opacity-30 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles size={13} />
              <span className="text-[10px] uppercase tracking-[0.22em]">Travel Wrapped</span>
            </div>
            {loading ? (
              <div className="h-10 w-56 bg-muted rounded mt-4 animate-pulse" />
            ) : data?.total_flights ? (
              <>
                <p className="text-[30px] font-light leading-tight tracking-tight mt-3">
                  You were a <span className="font-semibold text-primary">{data.travel_personality}</span>.
                </p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {data.total_flights} flights, {data.total_air_hours} air hours, and {data.airport_hours} estimated airport hours.
                </p>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  {personalityCopy[data.travel_personality] || "Your route pattern, home time, and airport rhythm shaped a distinct travel personality this year."}
                </p>
                <button
                  onClick={shareWrapped}
                  className="tl-btn-primary mt-5 inline-flex items-center gap-2 text-sm"
                  data-testid="wrapped-share-btn"
                >
                  <Share2 size={14} /> Share your {year} Wrapped
                </button>
              </>
            ) : (
              <>
                <p className="text-[24px] font-light leading-snug tracking-tight mt-3">No flights in {year} yet.</p>
                <p className="text-sm text-muted-foreground mt-2">Add tickets and this becomes your annual travel story.</p>
                <button onClick={() => navigate("/import")} className="tl-btn-primary mt-5 text-sm">Add old boarding passes</button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Flights" value={data?.total_flights} icon={Plane} iconClass="tl-icon-flights" />
          <Stat label="Air hours" value={data?.total_air_hours} decimals={1} icon={Clock4} iconClass="tl-icon-hours" />
          <Stat label="Airport hours" value={data?.airport_hours} decimals={1} icon={Calendar} iconClass="tl-icon-route" />
          <Stat label="Home days" value={data?.home_days} decimals={1} icon={HomeIcon} iconClass="tl-icon-home" />
          <Stat label="Top airport" raw={data?.top_airport || "—"} icon={MapPin} iconClass="tl-icon-away" />
          <Stat label="CO₂ estimate" value={data?.carbon_kg ? Math.round(data.carbon_kg / 100) / 10 : 0} suffix="t" decimals={1} icon={Cloud} iconClass="tl-icon-flights" />
        </div>

        {cards.length > 0 && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 snap-x" data-testid="wrapped-cards">
            {cards.map((card, idx) => (
              <div key={`${card.kind}-${idx}`} className="min-w-[78%] snap-center tl-card p-5 flex flex-col justify-between gap-6 bg-gradient-to-br from-primary/20 via-secondary to-background">
                <div className="w-11 h-11 rounded-2xl bg-primary/12 text-primary flex items-center justify-center">
                  {card.kind === "route" ? <Globe2 size={17} /> : card.kind === "city" ? <MapPin size={17} /> : <Trophy size={17} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-semibold mt-1">{card.value}</p>
                  {card.detail && <p className="text-xs text-muted-foreground">{card.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {data?.milestones?.length > 0 && (
          <div className="tl-card p-4" data-testid="wrapped-milestones">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">Milestones</p>
            <ul className="flex flex-col gap-2">
              {data.milestones.map((m) => (
                <li key={m} className="text-sm border-l-2 border-primary/40 pl-3">{m}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Shell>
  );
}
