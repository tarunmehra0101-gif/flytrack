import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plane, Clock4, Home as HomeIcon, Building2, Route, Trophy, Timer, Sparkles, CalendarDays,
  PlusCircle, Map, ListTree, Globe2, ArrowRight, Camera, MapPin, FileText, ChevronRight
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import LeafletTravelMap from "@/components/LeafletTravelMap";
import ComponentErrorBoundary from "@/components/ComponentErrorBoundary";
import AirlineLogo from "@/components/AirlineLogo";
import { cityImageUrl } from "@/pages/Cities";
import {
  AnimatedGlobeIcon,
  AnimatedPlaneIcon,
  AnimatedBarcodeIcon,
  AnimatedUploadIcon,
  AnimatedSuccessIcon,
  AnimatedClockIcon,
  AnimatedHomeIcon,
  AnimatedBuildingIcon,
  AnimatedTrophyIcon,
  AnimatedRouteIcon,
  AnimatedMapPinIcon,
  AnimatedSparklesIcon,
  AnimatedRadarIcon,
  AnimatedCompassIcon,
  AnimatedLuggageScannerIcon,
  AnimatedTurbulenceIcon,
  AnimatedUserIcon,
  AnimatedManualEntryIcon,
  FlightLoadingAnimation
} from "@/components/ui/AnimatedIcons";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))", "#70b8ff"];

const KpiTile = ({ label, value, suffix = "", icon: Icon, decimals = 0, testId, subtext, iconClass = "" }) => (
  <motion.div
    whileHover={{ borderColor: "rgba(59, 158, 255, 0.5)" }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.15 }}
    className="tl-card tl-card-interactive p-4 flex flex-col justify-between h-28"
    data-testid={testId}
  >
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      {Icon && <Icon size={24} className={iconClass || "text-muted-foreground"} />}
    </div>
    <p className="text-3xl tl-number mt-auto">
      <CountUp value={value} decimals={decimals} suffix={suffix} />
    </p>
    {subtext && <p className="text-[10px] text-muted-foreground mt-1">{subtext}</p>}
  </motion.div>
);

const glowShadows = {
  emerald: "shadow-none border-emerald-500/30",
  gold: "shadow-none border-amber-500/30",
  sky: "shadow-none border-sky-500/30",
  violet: "shadow-none border-violet-500/30",
  rose: "shadow-none border-rose-500/30",
};

const InsightVisualCard = ({ title, detail, icon: Icon, tone = "emerald", metric }) => {
  const glowClass = glowShadows[tone] || "shadow-none border-white/10";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.35 }}
      className={`tl-insight-card tl-insight-${tone} border ${glowClass} min-w-[80%] snap-center flex-shrink-0`}
    >
      <div className="tl-insight-graphic" aria-hidden>
        <span className="tl-insight-ring" />
        <Icon size={42} />
      </div>
      <div className="relative z-10 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">{title}</p>
        {metric && <p className="tl-number text-3xl leading-none mt-2 font-semibold text-white">{metric}</p>}
        <p className="text-sm text-white/90 leading-snug mt-2.5">{detail}</p>
      </div>
    </motion.div>
  );
};

const CustomChartTooltip = ({ active, payload, monthlyDetails }) => {
  if (active && payload && payload.length && payload[0]) {
    const data = payload[0].payload;
    if (!data || !data.month) return null;
    const dateObj = new Date(data.month + "-02");
    if (isNaN(dateObj.getTime())) return null;
    const monthName = MONTHS[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    const monthKey = data.month;

    const flights = data.flights;
    const airMinutes = data.air_minutes || 0;
    const hours = Math.floor(airMinutes / 60);
    const mins = Math.round(airMinutes % 60);
    
    // Get enriched data from monthlyDetails
    const details = monthlyDetails?.[monthKey];
    
    return (
      <div className="tl-card p-3 shadow-lg border border-primary/20 backdrop-blur-md bg-background/90 text-sm flex flex-col gap-1.5 animate-fade-up z-50">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{monthName} {year}</p>
        <div className="flex items-center justify-between gap-6 mt-1">
          <span className="text-foreground/80 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Flights:
          </span>
          <span className="font-semibold">{flights}</span>
        </div>
        {airMinutes > 0 && (
          <div className="flex items-center justify-between gap-6">
            <span className="text-foreground/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#70b8ff' }} /> Air time:
            </span>
            <span className="font-semibold" style={{ color: '#70b8ff' }}>
              {hours > 0 ? `${hours}h ` : ""}{mins}m
            </span>
          </div>
        )}
        {details?.topRoute && (
          <div className="flex items-center justify-between gap-6">
            <span className="text-foreground/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff9592' }} /> Top route:
            </span>
            <span className="font-semibold text-[11px] tl-mono">{details.topRoute}</span>
          </div>
        )}
        {details?.topAirline && (
          <div className="flex items-center justify-between gap-6">
            <span className="text-foreground/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#baa7ff' }} /> Top airline:
            </span>
            <span className="font-semibold text-[11px]">{details.topAirline}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length && payload[0]) {
    const data = payload[0];
    if (!data || !data.payload) return null;
    const name = data.name;
    const value = data.value;
    const days = (value / (60 * 24)).toFixed(1);
    const hours = (value / 60).toFixed(1);
    let displayValue = `${days} days`;
    if (name === "In air") {
      displayValue = `${hours} hours`;
    }
    const color = data.payload.fill || "hsl(var(--primary))";
    return (
      <div className="tl-card p-3 shadow-lg border border-border/60 backdrop-blur-md bg-background/90 text-sm flex flex-col gap-1.5 animate-fade-up z-50">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Category</p>
        <div className="flex items-center justify-between gap-6 mt-1">
          <span className="text-foreground/80 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} /> {name}:
          </span>
          <span className="font-semibold" style={{ color: color }}>{displayValue}</span>
        </div>
      </div>
    );
  }
  return null;
};

/* ============ EMPTY STATE — First-time user ============ */
function EmptyDashboard({ navigate, hello }) {
  const previewSections = [
    {
      title: "Flight Timeline",
      desc: "Every flight, layover, and trip — organized chronologically.",
      icon: ListTree,
      image: "https://images.pexels.com/photos/3769138/pexels-photo-3769138.jpeg?auto=compress&cs=tinysrgb&w=400",
      path: "/timeline",
    },
    {
      title: "Travel Map",
      desc: "All your routes and cities on one interactive aviation map.",
      icon: Map,
      image: "https://images.pexels.com/photos/1252500/pexels-photo-1252500.jpeg?auto=compress&cs=tinysrgb&w=400",
      path: "/map",
    },
    {
      title: "Wrapped",
      desc: "Your yearly travel story — flights, cities, milestones, and more.",
      icon: Globe2,
      image: "https://images.pexels.com/photos/346885/pexels-photo-346885.jpeg?auto=compress&cs=tinysrgb&w=400",
      path: "/wrapped",
    },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 pb-10 animate-fade-up">
      {/* Welcome hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="tl-card p-5 relative overflow-hidden"
        data-testid="hero-insight-card"
      >
        <div className="tl-radar-grid absolute inset-0 opacity-20 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-3">
            <Sparkles size={13} />
            <span className="text-[10px] uppercase tracking-[0.22em]">Welcome aboard</span>
          </div>
          <div className="flex items-center gap-2 text-[22px] font-light leading-snug tracking-tight">
            <span>Hey {hello}, your travel story starts here</span>
            <motion.div animate={{ y: [0, -3, 0], opacity: [0.7, 1, 0.7], rotate: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
              <Plane size={20} className="text-primary mt-1" />
            </motion.div>
          </div>
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
            className="tl-card tl-card-interactive flex flex-col items-center justify-center gap-2 py-4"
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
            <div className="relative h-32 overflow-hidden rounded-t-2xl">
              <img
                src={section.image}
                alt={section.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
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
        <KpiTile testId="kpi-flights" label="Flights" value={0} icon={AnimatedPlaneIcon} subtext="Your journeys start here" />
        <KpiTile testId="kpi-hours" label="Time in the sky" value={0} icon={AnimatedClockIcon} subtext="Waiting to take off" />
        <KpiTile testId="kpi-home-days" label="Home base" value={0} icon={AnimatedHomeIcon} subtext="We'll track this for you" />
        <KpiTile testId="kpi-away-days" label="Days exploring" value={0} icon={AnimatedBuildingIcon} subtext="Adventures await" />
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
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [citiesData, setCitiesData] = useState([]);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState("all");
  const [mapRoutes, setMapRoutes] = useState({ routes: [], markers: [] });
  const [flights, setFlights] = useState([]);

  // 1. Load all flights — default to "all" time
  useEffect(() => {
    (async () => {
      try {
        const { data: flightsList } = await api.get("/flights");
        setFlights(flightsList || []);
      } catch (err) {
        console.error("Failed to load flights on mount:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2. Fetch dashboard data when selectedYear changes
  useEffect(() => {
    if (loading) return;
    if (flights.length === 0) {
      setData(null);
      setDashboardLoading(false);
      return;
    }

    (async () => {
      setDashboardLoading(true);
      try {
        const { data: dashData } = await api.get("/dashboard", { params: { year: selectedYear } });
        setData(dashData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setDashboardLoading(false);
      }
    })();
  }, [selectedYear, loading, flights.length]);

  // 3. Fetch cities travelled list based on selectedYear
  useEffect(() => {
    if (!data?.total_flights) return;
    api.get("/cities", { params: { year: selectedYear } })
      .then(({ data: res }) => setCitiesData(res?.cities || res || []))
      .catch(() => setCitiesData([]));
  }, [selectedYear, data?.total_flights]);

  // 4. Fetch map routes based on selectedYear
  useEffect(() => {
    if (!data?.total_flights) return;
    api.get("/map-data", { params: { year: selectedYear } })
      .then(({ data: res }) => setMapRoutes({ routes: res?.routes || [], markers: res?.airport_markers || [] }))
      .catch(() => {});
  }, [selectedYear, data?.total_flights]);

  // 5. Compute monthly flight details for richer chart tooltips
  const monthlyDetails = useMemo(() => {
    if (!flights.length) return {};
    const details = {};
    
    const filteredFlights = selectedYear === "all" ? flights : flights.filter(f => {
      const d = f.departure_time_utc || f.flight_date;
      return d && new Date(d).getFullYear() === Number(selectedYear);
    });
    
    filteredFlights.forEach(f => {
      const d = f.departure_time_utc || f.flight_date;
      if (!d) return;
      const monthKey = d.slice(0, 7); // YYYY-MM
      if (!details[monthKey]) {
        details[monthKey] = { routes: {}, airlines: {} };
      }
      const route = `${f.departure_airport_iata || "?"}-${f.arrival_airport_iata || "?"}`;
      details[monthKey].routes[route] = (details[monthKey].routes[route] || 0) + 1;
      const airline = f.airline_name || f.airline_iata || "Unknown";
      details[monthKey].airlines[airline] = (details[monthKey].airlines[airline] || 0) + 1;
    });
    
    // Find top route and airline for each month
    const result = {};
    for (const [month, d] of Object.entries(details)) {
      const topRoute = Object.entries(d.routes).sort((a, b) => b[1] - a[1])[0];
      const topAirline = Object.entries(d.airlines).sort((a, b) => b[1] - a[1])[0];
      result[month] = {
        topRoute: topRoute ? topRoute[0] : null,
        topAirline: topAirline ? topAirline[0] : null,
      };
    }
    return result;
  }, [flights, selectedYear]);

  // 6. Get recent flights for timeline preview (last 3)
  const recentFlights = useMemo(() => {
    if (!flights.length) return [];
    return [...flights]
      .sort((a, b) => {
        const da = a.departure_time_utc || a.flight_date || "";
        const db = b.departure_time_utc || b.flight_date || "";
        return db.localeCompare(da);
      })
      .slice(0, 3);
  }, [flights]);

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

  const hasFlights = !loading && flights.length > 0;

  return (
    <Shell title={`Hello, ${hello}`} right={<span className="text-[11px] text-muted-foreground tl-mono">{profile?.home_airport_iata || "—"}</span>}>
      {loading ? (
        <div className="flex flex-col gap-5 p-4 pb-10 animate-fade-up">
          <div className="tl-card p-5 h-40 animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="tl-card h-28 animate-pulse" />)}
          </div>
        </div>
      ) : !hasFlights ? (
        <EmptyDashboard navigate={navigate} hello={hello} />
      ) : (
        <div className="flex flex-col gap-5 p-4 pb-10 animate-fade-up">
          {/* Year Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mr-1 shrink-0">Year:</span>
            <button
              onClick={() => setSelectedYear("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition shrink-0 ${
                selectedYear === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent hover:bg-secondary text-muted-foreground border-border"
              }`}
            >
              All Time
            </button>
            {Array.from(new Set(flights.map(f => {
              const d = f.departure_time_utc || f.flight_date;
              return d ? new Date(d).getFullYear() : null;
            }).filter(Boolean))).sort((a, b) => b - a).map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(String(y))}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition shrink-0 ${
                  selectedYear === String(y)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent hover:bg-secondary text-muted-foreground border-border"
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Hero insight */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="tl-card p-5 relative overflow-hidden"
            data-testid="hero-insight-card"
          >
            <div className="tl-radar-grid absolute inset-0 opacity-20 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles size={13} />
                <span className="text-[10px] uppercase tracking-[0.22em]">Your journey so far</span>
              </div>
              <div className="text-[26px] font-light leading-tight tracking-tight mt-2 flex items-center flex-wrap gap-x-2">
                <span>You've spent</span>{" "}
                <span className="font-semibold text-primary">
                  <CountUp value={data?.total_air_hours || 0} decimals={1} suffix=" hours" />
                </span>{" "}
                <span>above the clouds across</span>{" "}
                <span className="font-semibold">
                  <CountUp value={data?.total_flights || 0} />
                </span>{" "}
                <span>flights</span>
                <span className="inline-flex items-center transform -rotate-12"><AnimatedPlaneIcon size={28} /></span>
              </div>
              {rotatedInsight && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{rotatedInsight}</p>
              )}
              {data?.next_trip && (
                <button
                  onClick={() => navigate("/timeline")}
                  className="mt-4 w-full tl-card tl-card-interactive p-3 flex items-center gap-3 text-left transition"
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

          {/* PROMINENT ADD FLIGHT CTA */}
          <motion.button
            onClick={() => navigate("/import")}
            whileHover={{ borderColor: "rgba(59, 158, 255, 0.7)" }}
            whileTap={{ scale: 0.98 }}
            className="w-full tl-btn-primary flex items-center justify-center gap-2.5 py-4 text-base font-semibold"
            data-testid="home-add-flight-cta"
          >
            <PlusCircle size={18} />
            Add a Flight
          </motion.button>

          {/* Action tiles — Timeline + Year in Review */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={() => navigate("/timeline")}
              whileHover={{ borderColor: "rgba(59, 158, 255, 0.4)" }}
              className="tl-card tl-card-interactive p-4 text-left"
              data-testid="home-timeline"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <ListTree size={16} />
                </div>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold">My timeline</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{data?.total_flights || 0} flights logged</p>
            </motion.button>

            <motion.button
              onClick={() => navigate("/wrapped")}
              whileHover={{ borderColor: "rgba(59, 158, 255, 0.4)" }}
              className="tl-card tl-card-interactive p-4 text-left"
              data-testid="home-wrapped"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Globe2 size={16} />
                </div>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold">Year in review</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Stats, personality & milestones</p>
            </motion.button>
          </div>

          {/* Timeline Preview — last 3 flights */}
          {recentFlights.length > 0 && (
            <div className="tl-card p-4" data-testid="timeline-preview">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Recent</p>
                  <p className="text-sm font-medium">Latest flights</p>
                </div>
                <button onClick={() => navigate("/timeline")} className="text-[10px] text-primary font-semibold flex items-center gap-0.5">
                  View all <ArrowRight size={10} />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {recentFlights.map((f, idx) => {
                  const iataKey = String(f.airline_iata || "").toUpperCase();
                  const depTime = (() => {
                    try {
                      const t = f.departure_time_local || f.departure_time_utc;
                      if (!t) return "—";
                      if (String(t).match(/^\d{1,2}[:.]\d{2}/)) return String(t).replace(".", ":").slice(0, 5);
                      return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    } catch { return "—"; }
                  })();
                  const dateStr = (() => {
                    try {
                      const d = f.flight_date || f.departure_time_utc;
                      if (!d) return "";
                      const dateObj = String(d).length === 10 ? new Date(`${d}T00:00:00`) : new Date(d);
                      return dateObj.toLocaleDateString([], { day: "2-digit", month: "short" });
                    } catch { return ""; }
                  })();
                  
                  return (
                    <button
                      key={f.id || idx}
                      onClick={() => navigate("/timeline")}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition text-left"
                    >
                      <div className="bg-white p-0.5 rounded-md flex items-center justify-center flex-shrink-0 w-7 h-7 border border-border">
                        <AirlineLogo iata={iataKey} size={20} rounded="rounded-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground">{dateStr} · {depTime}</p>
                        <p className="text-xs font-semibold truncate">
                          {f.departure_airport_iata || "?"} → {f.arrival_airport_iata || "?"} · {f.airline_name || iataKey}
                        </p>
                      </div>
                      <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live map preview */}
          {mapRoutes.markers.length > 0 && (
            <motion.button
              onClick={() => navigate("/map")}
              whileHover={{ borderColor: "rgba(59, 158, 255, 0.4)" }}
              transition={{ duration: 0.15 }}
              className="tl-card tl-card-interactive overflow-hidden text-left group relative"
              data-testid="home-map-preview"
            >
              <div className="relative h-48 overflow-hidden rounded-t-2xl pointer-events-none">
                <div className="absolute inset-0 w-full h-full">
                  <ComponentErrorBoundary>
                    <LeafletTravelMap
                      mapData={{ routes: mapRoutes.routes, airport_markers: mapRoutes.markers }}
                      selectedYear={selectedYear === "all" ? "All" : selectedYear}
                    />
                  </ComponentErrorBoundary>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
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
            </motion.button>
          )}

          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3">
            <KpiTile testId="kpi-flights" label="Flights taken" value={data?.total_flights || 0} icon={AnimatedRadarIcon} subtext={`${data?.cities_visited || 0} cities explored`} />
            <KpiTile testId="kpi-hours" label="Time in the sky" value={Math.round(data?.total_air_hours || 0)} icon={AnimatedTurbulenceIcon} subtext={`${airPct}% of your year airborne`} />
            <KpiTile testId="kpi-home-days" label="Home base" value={Math.round(data?.home_days || 0)} icon={AnimatedHomeIcon} subtext={`${homePct}% cozy at home`} />
            <KpiTile testId="kpi-away-days" label="Days exploring" value={Math.round(data?.away_days || 0)} icon={AnimatedCompassIcon} subtext={`${awayPct}% out discovering`} />
          </div>

          {/* Home vs away ring */}
          {data && (data.home_minutes > 0 || data.away_minutes > 0) && (
            <div className="tl-card p-4" data-testid="home-vs-away-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Balance</p>
                  <p className="text-sm font-medium">Home vs. Away</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p><span className="inline-block w-2 h-2 rounded-full bg-primary mr-1" />Home {Math.round(data.home_days)}d</p>
                  <p><span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/60 mr-1" />Away {Math.round(data.away_days)}d</p>
                  <p><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#70b8ff' }} />Air {Math.round(data.total_air_hours)}h</p>
                </div>
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomPieTooltip />} />
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
            <div className="tl-card p-4" data-testid="monthly-chart">
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
                      content={<CustomChartTooltip monthlyDetails={monthlyDetails} />}
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
            <div className="tl-card p-4" data-testid="top-cities-card">
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

          {/* Cities Travelled — with real images */}
          {citiesData.length > 0 && (
            <div className="tl-card p-4" data-testid="cities-travelled">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Explored</p>
                  <p className="text-sm font-medium">Cities travelled</p>
                </div>
                <MapPin size={14} className="text-muted-foreground" />
              </div>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {citiesData.slice(0, 12).map((city) => {
                  const imgUrl = cityImageUrl(city.iata, city.city);
                  return (
                    <button
                      key={city.city || city.iata}
                      onClick={() => navigate("/cities")}
                      className="flex-shrink-0 w-28 h-36 rounded-xl overflow-hidden relative group"
                    >
                      <img 
                        src={imgUrl} 
                        alt={city.city || city.iata} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2.5">
                        <p className="text-xs font-semibold text-white truncate">{city.city || city.iata}</p>
                        <p className="text-[10px] text-white/70 mt-0.5">
                          {city.visits || city.count || 0} visit{(city.visits || city.count || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top route / airline */}
          {(data?.top_route || data?.top_airline) && (
            <div className="grid grid-cols-2 gap-3">
              {data?.top_route && (
                <button onClick={() => setDetail("route")} className="tl-card tl-card-interactive p-4 text-left transition" data-testid="top-route-card">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Top route</p>
                    <Route size={13} className="tl-icon-route" />
                  </div>
                  <p className="tl-mono text-xl font-bold tracking-tight">{data.top_route}</p>
                  <p className="text-xs text-muted-foreground mt-1">{data.top_route_count} flights</p>
                </button>
              )}
              {data?.top_airline_name && (
                <button onClick={() => setDetail("airline")} className="tl-card tl-card-interactive p-4 text-left transition" data-testid="top-airline-card">
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

          {/* Visual insights — horizontal carousel */}
          {data?.insights?.length > 1 && (
            <div data-testid="insights-card">
              <div className="flex items-center gap-2 mb-3 text-primary">
                <Sparkles size={13} />
                <p className="text-[10px] uppercase tracking-[0.22em]">Insights</p>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x pb-2">
                <InsightVisualCard title="Above the clouds" metric={`${Math.round(data.total_air_hours || 0)}h`} detail={data.insights[0]} icon={AnimatedPlaneIcon} tone="emerald" />
                <InsightVisualCard title="Home gravity" metric={`${Math.round(data.home_days || 0)}d`} detail={data.insights[1] || `${profile?.home_city_name || "Home"} anchors your year.`} icon={AnimatedHomeIcon} tone="gold" />
                <InsightVisualCard title="Airport time" metric={`${Math.round(data.airport_hours || 0)}h`} detail={data.insights[2] || "Airport time is tracked as an estimate until exact check-in data is available."} icon={AnimatedClockIcon} tone="sky" />
                {data.top_route && <InsightVisualCard title="Route loop" metric={data.top_route} detail={`${data.top_route_count} flights on your most repeated route.`} icon={AnimatedRouteIcon} tone="violet" />}
                {data.insights[3] && <InsightVisualCard title="Travel rhythm" detail={data.insights[3]} icon={AnimatedTrophyIcon} tone="rose" />}
              </div>
            </div>
          )}
        </div>
      )}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{detail === "route" ? "Route breakdown" : "Airline history"}</DialogTitle>
            <DialogDescription>Your most frequent {detail === "route" ? "routes" : "airlines"} by number of flights.</DialogDescription>
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
