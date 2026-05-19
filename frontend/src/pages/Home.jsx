import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plane, Clock4, Home as HomeIcon, Building2, Route, Trophy, Timer, Sparkles, CalendarDays,
  PlusCircle, Map, ListTree, Globe2, ArrowRight, Mail, Camera, MapPin
} from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import Shell from "@/components/shell/Shell";
import CountUp from "@/components/CountUp";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FlightMap from "@/components/FlightMap";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))", "#38bdf8"];

const KpiTile = ({ label, value, suffix = "", icon: Icon, decimals = 0, testId, subtext, iconClass = "" }) => (
  <div className="tl-card tl-card-intense tl-card-interactive p-4 flex flex-col justify-between h-28" data-testid={testId}>
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      {Icon && <Icon size={14} className={iconClass || "text-muted-foreground"} />}
    </div>
    <p className="text-3xl tl-number mt-auto">
      <CountUp value={value} decimals={decimals} suffix={suffix} />
    </p>
    {subtext && <p className="text-[10px] text-muted-foreground mt-1">{subtext}</p>}
  </div>
);

const InsightVisualCard = ({ title, detail, icon: Icon, tone = "emerald", metric }) => (
  <motion.div
    initial={{ opacity: 0, y: 12, scale: 0.98 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true, amount: 0.35 }}
    transition={{ duration: 0.35 }}
    className={`tl-insight-card tl-insight-${tone}`}
  >
    <div className="tl-insight-graphic" aria-hidden>
      <span className="tl-insight-ring" />
      <Icon size={34} strokeWidth={1.7} />
    </div>
    <div className="relative z-10 min-w-0">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">{title}</p>
      {metric && <p className="tl-number text-3xl leading-none mt-2">{metric}</p>}
      <p className="text-sm text-white/86 leading-snug mt-2">{detail}</p>
    </div>
  </motion.div>
);

const ActionTile = ({ icon: Icon, title, desc, onClick, testId }) => (
  <button onClick={onClick} className="tl-action-tile" data-testid={testId}>
    <span className="tl-action-icon"><Icon size={16} /></span>
    <span className="min-w-0 text-left">
      <span className="block text-sm font-semibold">{title}</span>
      <span className="block text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</span>
    </span>
  </button>
);

/* ============ EMPTY STATE — First-time user ============ */
function EmptyDashboard({ navigate, hello }) {
  const previewSections = [
    {
      title: "Flight Timeline",
      desc: "Every flight, layover, and trip — organized chronologically.",
      icon: ListTree,
      image: "https://images.pexels.com/photos/3769138/pexels-photo-3769138.jpeg?auto=compress&cs=tinysrgb&w=400",
      path: "/timeline",
      color: "from-blue-500/20 to-cyan-500/20",
    },
    {
      title: "Travel Map",
      desc: "All your routes and cities on one interactive aviation map.",
      icon: Map,
      image: "https://images.pexels.com/photos/1252500/pexels-photo-1252500.jpeg?auto=compress&cs=tinysrgb&w=400",
      path: "/map",
      color: "from-emerald-500/20 to-teal-500/20",
    },
    {
      title: "Wrapped",
      desc: "Your yearly travel story — flights, cities, milestones, and more.",
      icon: Globe2,
      image: "https://images.pexels.com/photos/346885/pexels-photo-346885.jpeg?auto=compress&cs=tinysrgb&w=400",
      path: "/wrapped",
      color: "from-violet-500/20 to-purple-500/20",
    },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 pb-10 animate-fade-up">
      {/* Welcome hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="tl-card tl-card-intense p-5 relative overflow-hidden"
        data-testid="hero-insight-card"
      >
        <div className="tl-radar-grid absolute inset-0 opacity-30 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-3">
            <Sparkles size={13} />
            <span className="text-[10px] uppercase tracking-[0.22em]">Welcome aboard</span>
          </div>
          <p className="text-[22px] font-light leading-snug tracking-tight">
            Hey {hello}, your travel story starts here ✈️
          </p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Upload a PDF ticket, scan a boarding pass, or add a flight manually. Your personal travel map, stats & highlights are just one tap away.
          </p>
          <button
            onClick={() => navigate("/import")}
            data-testid="hero-scan-cta"
            className="tl-btn-primary mt-5 inline-flex items-center gap-2 text-sm"
          >
            <PlusCircle size={15} />
            Unlock my travel story
          </button>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { icon: FileText, label: "PDF Ticket", onClick: () => navigate("/import") },
          { icon: Camera, label: "Barcode", onClick: () => navigate("/import") },
          { icon: PlusCircle, label: "Manual", onClick: () => navigate("/import") },
        ].map(({ icon: QIcon, label, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="tl-card tl-card-interactive flex flex-col items-center justify-center gap-2 py-4 hover:border-primary/30 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <QIcon size={18} />
            </div>
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Preview section cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary px-1">
          <Sparkles size={12} />
          <span className="text-[10px] uppercase tracking-[0.22em]">Discover what's waiting</span>
        </div>
        {previewSections.map((section, idx) => (
          <motion.button
            key={section.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            onClick={() => navigate(section.path)}
            className="tl-card tl-card-interactive w-full overflow-hidden text-left group"
          >
            <div className="relative h-32 overflow-hidden">
              <img
                src={section.image}
                alt={section.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${section.color} via-background/80 to-transparent`} />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </div>
            <div className="p-4 -mt-8 relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <section.icon size={14} className="text-primary" />
                <span className="text-xs font-semibold">{section.title}</span>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{section.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Stats preview (zeroed) */}
      <div className="grid grid-cols-2 gap-3">
        <KpiTile testId="kpi-flights" label="Flights" value={0} icon={Plane} subtext="Your journeys start here" />
        <KpiTile testId="kpi-hours" label="Time in the sky" value={0} icon={Clock4} subtext="Waiting to take off" />
        <KpiTile testId="kpi-home-days" label="Home base" value={0} icon={HomeIcon} subtext="We'll track this for you" />
        <KpiTile testId="kpi-away-days" label="Days exploring" value={0} icon={Building2} subtext="Adventures await" />
      </div>
    </div>
  );
}

/* ============ MAIN HOME COMPONENT ============ */
export default function Home() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [citiesData, setCitiesData] = useState([]);
  const currentYear = new Date().getFullYear();
  const [citiesYear, setCitiesYear] = useState(currentYear);
  const [mapRoutes, setMapRoutes] = useState({ routes: [], markers: [] });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/dashboard");
        setData(data);
      } catch {
        // Silently fail on first load — empty state is shown instead
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!data?.total_flights) return;
    api.get("/cities", { params: { year: citiesYear } })
      .then(({ data: res }) => setCitiesData(res?.cities || res || []))
      .catch(() => setCitiesData([]));
  }, [citiesYear, data?.total_flights]);

  useEffect(() => {
    if (!data?.total_flights) return;
    api.get("/map-data", { params: { year: "all" } })
      .then(({ data: res }) => setMapRoutes({ routes: res?.routes || [], markers: res?.airport_markers || [] }))
      .catch(() => {});
  }, [data?.total_flights]);

  const hello = profile?.preferred_name || (user?.name || "").split(" ")[0] || "there";
  const yr = new Date().getFullYear();
  const isLeap = (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0;
  const totalYearMinutes = (isLeap ? 366 : 365) * 24 * 60;
  const homePct = data?.home_minutes ? Math.round((data.home_minutes / totalYearMinutes) * 100) : 0;
  const awayPct = data?.away_minutes ? Math.round((data.away_minutes / totalYearMinutes) * 100) : 0;
  const airPct = data?.total_air_minutes ? Math.round((data.total_air_minutes / totalYearMinutes) * 100) : 0;
  const balanceData = data ? [
    { name: "Home", value: Math.max(0, data.home_minutes || 0) },
    { name: "Away", value: Math.max(0, data.away_minutes || 0) },
    { name: "In air", value: Math.max(0, data.total_air_minutes || Math.round((data.total_air_hours || 0) * 60)) },
  ].filter((x) => x.value > 0) : [];
  const rotatedInsight = data?.insights?.length
    ? data.insights[new Date().getDate() % data.insights.length]
    : null;

  const hasFlights = !loading && data?.total_flights > 0;

  return (
    <Shell title={`Hello, ${hello}`} right={<span className="text-[11px] text-muted-foreground tl-mono">{profile?.home_airport_iata || "—"}</span>}>
      {loading ? (
        <div className="flex flex-col gap-5 p-4 pb-10 animate-fade-up">
          <div className="tl-card tl-card-intense p-5 h-40 animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="tl-card tl-card-intense h-28 animate-pulse" />)}
          </div>
        </div>
      ) : !hasFlights ? (
        <EmptyDashboard navigate={navigate} hello={hello} />
      ) : (
        <div className="flex flex-col gap-5 p-4 pb-10 animate-fade-up">
          {/* Hero insight */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="tl-card tl-card-intense p-5 relative overflow-hidden"
            data-testid="hero-insight-card"
          >
            <div className="tl-radar-grid absolute inset-0 opacity-30 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles size={13} />
                <span className="text-[10px] uppercase tracking-[0.22em]">Your journey so far</span>
              </div>
              <p className="text-[26px] font-light leading-tight tracking-tight mt-2">
                You've spent{" "}
                <span className="font-semibold text-primary">
                  <CountUp value={data?.total_air_hours || 0} decimals={1} suffix=" hours" />
                </span>{" "}
                above the clouds across{" "}
                <span className="font-semibold">
                  <CountUp value={data?.total_flights || 0} />
                </span>{" "}
                flights ✈️
              </p>
              {rotatedInsight && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{rotatedInsight}</p>
              )}
              {data.next_trip && (
                <button
                  onClick={() => navigate("/timeline")}
                  className="mt-4 w-full tl-card tl-card-interactive p-3 flex items-center gap-3 text-left hover:border-primary/40 transition"
                  data-testid="next-trip-card"
                >
                  <CalendarDays size={16} className="text-primary" />
                  <span className="min-w-0">
                    <span className="block text-xs uppercase tracking-[0.18em] text-muted-foreground">Next trip</span>
                    <span className="block text-sm font-semibold truncate">
                      {data.next_trip.route?.replace("-", " → ")} in {data.next_trip.days_until} days
                    </span>
                  </span>
                </button>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-3" data-testid="home-actions">
            <ActionTile testId="home-add-flight" icon={PlusCircle} title="Add flights" desc="Scan a boarding pass, upload a PDF, or add manually." onClick={() => navigate("/import")} />
            <ActionTile testId="home-timeline" icon={ListTree} title="My timeline" desc="Every flight, layover & trip — in one beautiful feed." onClick={() => navigate("/timeline")} />
            <ActionTile testId="home-map" icon={Map} title="Where I've been" desc="See every route & city on your personal travel map." onClick={() => navigate("/map")} />
            <ActionTile testId="home-wrapped" icon={Globe2} title="Year in review" desc="Your travel highlights, stats & personality — beautifully wrapped." onClick={() => navigate("/wrapped")} />
          </div>

          {/* Live map preview */}
          {mapRoutes.markers.length > 0 && (
            <button
              onClick={() => navigate("/map")}
              className="tl-card tl-card-intense tl-card-interactive overflow-hidden text-left group"
              data-testid="home-map-preview"
            >
              <div className="relative h-48 overflow-hidden rounded-t-2xl">
                <FlightMap
                  routes={mapRoutes.routes}
                  markers={mapRoutes.markers}
                  interactive={false}
                  className="h-48"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
              </div>
              <div className="p-4 -mt-6 relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">Your flight map</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {mapRoutes.markers.length} airports · {mapRoutes.routes.length} routes
                  </p>
                </div>
                <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition" />
              </div>
            </button>
          )}

          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3">
            <KpiTile testId="kpi-flights" label="Flights taken" value={data?.total_flights || 0} icon={Plane} subtext={`${data?.cities_visited || 0} cities explored`} />
            <KpiTile testId="kpi-hours" label="Time in the sky" value={Math.round(data?.total_air_hours || 0)} icon={Clock4} subtext={`${airPct}% of your year airborne`} />
            <KpiTile testId="kpi-home-days" label="Home base" value={Math.round(data?.home_days || 0)} icon={HomeIcon} subtext={`${homePct}% cozy at home`} />
            <KpiTile testId="kpi-away-days" label="Days exploring" value={Math.round(data?.away_days || 0)} icon={Building2} subtext={`${awayPct}% out discovering`} />
          </div>

          {/* Home vs away ring */}
          {data && (data.home_minutes > 0 || data.away_minutes > 0) && (
            <div className="tl-card tl-card-intense p-4" data-testid="home-vs-away-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Balance</p>
                  <p className="text-sm font-medium">Home vs. Away</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p><span className="inline-block w-2 h-2 rounded-full bg-primary mr-1" />Home {Math.round(data.home_days)}d</p>
                  <p><span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/60 mr-1" />Away {Math.round(data.away_days)}d</p>
                  <p><span className="inline-block w-2 h-2 rounded-full bg-sky-400 mr-1" />Air {Math.round(data.total_air_hours)}h</p>
                </div>
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={balanceData} innerRadius={44} outerRadius={62} paddingAngle={2} dataKey="value" stroke="none">
                      {balanceData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Monthly flights */}
          {data?.monthly_series?.length > 0 && (
            <div className="tl-card tl-card-intense p-4" data-testid="monthly-chart">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Rhythm</p>
                  <p className="text-sm font-medium">Flights by month</p>
                </div>
                <Timer size={14} className="text-muted-foreground" />
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthly_series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradEm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="2 4" />
                    <XAxis dataKey="month" tickFormatter={(v) => MONTHS[Math.max(0, Math.min(11, Number(String(v).slice(-2)) - 1))] || v} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                      cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.3 }}
                    />
                    <Area type="monotone" dataKey="flights" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gradEm)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top cities leaderboard */}
          {data?.top_cities?.length > 0 && (
            <div className="tl-card tl-card-intense p-4" data-testid="top-cities-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Leaderboard</p>
                  <p className="text-sm font-medium">Top cities</p>
                </div>
                <Trophy size={14} className="text-muted-foreground" />
              </div>
              <ul className="flex flex-col gap-3">
                {data.top_cities.slice(0, 5).map((c, idx) => (
                  <li key={c.city} className="flex items-center gap-3">
                    <span className="tl-mono text-xs text-muted-foreground w-5">{String(idx + 1).padStart(2, "0")}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.city}</p>
                      <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, ((c.minutes || 0) / Math.max(1, ...data.top_cities.map(x => x.minutes || 0))) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="tl-mono text-xs text-muted-foreground">{c.days}d</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cities Travelled — with year filter */}
          {citiesData.length > 0 && (
            <div className="tl-card tl-card-intense p-4" data-testid="cities-travelled">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Explored</p>
                  <p className="text-sm font-medium">Cities travelled</p>
                </div>
                <div className="flex items-center gap-1">
                  {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                    <button
                      key={y}
                      onClick={() => setCitiesYear(y)}
                      className={`text-[10px] px-2 py-1 rounded-full transition ${citiesYear === y ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {citiesData.slice(0, 12).map((city) => (
                  <button
                    key={city.city || city.iata}
                    onClick={() => navigate("/cities")}
                    className="flex-shrink-0 w-28 tl-card tl-card-interactive p-3 text-center hover:border-primary/40 transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2">
                      <MapPin size={14} />
                    </div>
                    <p className="text-xs font-semibold truncate">{city.city || city.iata}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {city.visits || city.count || 0} visit{(city.visits || city.count || 0) !== 1 ? 's' : ''}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Top route / airline */}
          {(data?.top_route || data?.top_airline) && (
            <div className="grid grid-cols-2 gap-3">
              {data?.top_route && (
                <button onClick={() => setDetail("route")} className="tl-card tl-card-interactive p-4 text-left hover:border-primary/40 transition" data-testid="top-route-card">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Top route</p>
                    <Route size={13} className="tl-icon-route" />
                  </div>
                  <p className="tl-mono text-xl font-bold tracking-tight">{data.top_route}</p>
                  <p className="text-xs text-muted-foreground mt-1">{data.top_route_count} flights</p>
                </button>
              )}
              {data?.top_airline_name && (
                <button onClick={() => setDetail("airline")} className="tl-card tl-card-interactive p-4 text-left hover:border-primary/40 transition" data-testid="top-airline-card">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Top airline</p>
                    <Plane size={13} className="tl-icon-airline" />
                  </div>
                  <p className="text-lg font-semibold leading-tight">{data.top_airline_name}</p>
                  <p className="tl-mono text-xs text-muted-foreground mt-1">{data.top_airline}</p>
                </button>
              )}
            </div>
          )}

          {/* Visual insights */}
          {data?.insights?.length > 1 && (
            <div className="flex flex-col gap-3" data-testid="insights-card">
              <div className="flex items-center gap-2 mb-3 text-primary">
                <Sparkles size={13} />
                <p className="text-[10px] uppercase tracking-[0.22em]">Insights</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <InsightVisualCard title="Above the clouds" metric={`${Math.round(data.total_air_hours || 0)}h`} detail={data.insights[0]} icon={Plane} tone="emerald" />
                <InsightVisualCard title="Home gravity" metric={`${Math.round(data.home_days || 0)}d`} detail={data.insights[1] || `${profile?.home_city_name || "Home"} anchors your year.`} icon={HomeIcon} tone="gold" />
                <InsightVisualCard title="Airport time" metric={`${Math.round(data.airport_hours || 0)}h`} detail={data.insights[3] || "Airport time is tracked as an estimate until exact check-in data is available."} icon={Timer} tone="sky" />
                {data.top_route && <InsightVisualCard title="Route loop" metric={data.top_route} detail={`${data.top_route_count} flights on your most repeated route.`} icon={Route} tone="violet" />}
                {data.insights[4] && <InsightVisualCard title="Travel rhythm" detail={data.insights[4]} icon={Trophy} tone="rose" />}
              </div>
            </div>
          )}
        </div>
      )}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{detail === "route" ? "Route breakdown" : "Airline history"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {(detail === "route" ? (data?.route_frequency || []) : (data?.airline_split || [])).slice(0, 8).map((row, idx) => (
              <div key={`${detail}-${idx}`} className="tl-card p-3 flex items-center justify-between text-sm">
                <span className="font-medium">{row.route || row.airline_name || row.airline}</span>
                <span className="tl-mono text-xs text-muted-foreground">{row.count} flights</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
