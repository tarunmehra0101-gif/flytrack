import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Camera, Loader2, AlertTriangle, CheckCircle2,
  PenLine, History, FileText, Sparkles, X, Clock,
  PlaneTakeoff, Video,
} from "lucide-react";
import Shell from "@/components/shell/Shell";
import BoardingPassCard from "@/components/BoardingPassCard";
import AirlineLogo from "@/components/AirlineLogo";
import Autocomplete from "@/components/Autocomplete";
import { decodeBarcodeFromFile, fileToBase64, startLiveScanner, isCameraAvailable } from "@/lib/barcode";
import { ocrImageFile } from "@/lib/ticketText";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { CalendarDays } from "lucide-react";

function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

function SourceLabel({ type }) {
  const map = {
    boarding_pass_barcode: "Boarding pass",
    pdf_eticket: "PDF ticket",
    manual_entry: "Added manually",
  };
  return <span className="text-[10px] text-muted-foreground capitalize">{map[type] || type}</span>;
}

function friendlyField(name) {
  const map = {
    airline_iata: "airline",
    flight_number: "flight number",
    departure_airport_iata: "from airport",
    arrival_airport_iata: "to airport",
    flight_date: "flight date",
    departure_time_local: "takeoff time",
  };
  return map[name] || String(name || "").replaceAll("_", " ");
}

function mergeImportResults(results) {
  const clean = (results || []).filter(Boolean);
  const segments = clean.flatMap((r) => r.segments || (r.segment ? [r.segment] : []));
  const confirmed = clean.flatMap((r) => r.confirmed_segments || []);
  const messages = clean.map((r) => r.parse_message).filter(Boolean);
  return {
    artifact: clean[0]?.artifact,
    segment: segments[0],
    segments,
    confirmed_segments: confirmed,
    auto_confirmed: clean.reduce((sum, r) => sum + (r.auto_confirmed || 0), 0),
    duplicates: clean.reduce((sum, r) => sum + (r.duplicates || 0), 0),
    enrichment_applied: clean.some((r) => r.enrichment_applied),
    parse_confidence: Math.min(...clean.map((r) => r.parse_confidence ?? 1)),
    parse_message: messages[0] || null,
  };
}

export default function Import() {
  const navigate = useNavigate();
  const location = new URLSearchParams(window.location.search);
  const isOnboarding = location.get("onboarding") === "true";
  useAuth();
  const imgRef = useRef(null);
  const pdfRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | reading | looking_up | preview | error
  const [uploadType, setUploadType] = useState(null); // null | "image" | "pdf"
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");


  // Live scanner state
  const videoRef = useRef(null);
  const stopScannerRef = useRef(null);
  const [liveScanning, setLiveScanning] = useState(false);

  // Manual form state
  const [mAirline, setMAirline] = useState(null);
  const [mFlightNumber, setMFlightNumber] = useState("");
  const [mDate, setMDate] = useState("");
  const [mDepTime, setMDepTime] = useState("");
  const [mArrTime, setMArrTime] = useState("");
  const [mFetched, setMFetched] = useState(null);
  const [mFetching, setMFetching] = useState(false);
  const [mFrom, setMFrom] = useState(null);
  const [mTo, setMTo] = useState(null);
  const [mSeat, setMSeat] = useState("");
  const [mPnr, setMPnr] = useState("");
  const [mPassenger, setMPassenger] = useState("");
  const [mFlightOptions, setMFlightOptions] = useState([]);
  const [mSelectedFlight, setMSelectedFlight] = useState(null);

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/artifacts");
      setHistory(data);
    } catch (err) { console.error("Failed to load import history:", err); }
  };
  useEffect(() => { loadHistory(); }, []);

  // Live scanner handlers
  const startLiveScan = useCallback(() => {
    if (!isCameraAvailable()) {
      toast.error("Camera not available. Use photo upload instead.");
      return;
    }
    setLiveScanning(true);
  }, []);

  const stopLiveScan = useCallback(() => {
    if (stopScannerRef.current) {
      stopScannerRef.current();
      stopScannerRef.current = null;
    }
    setLiveScanning(false);
  }, []);

  useEffect(() => {
    if (!liveScanning || !videoRef.current) return;
    const onResult = async ({ text }) => {
      stopLiveScan();
      toast.success("Barcode detected!");
      setStatus("looking_up");
      try {
        const { data } = await api.post("/boarding-pass/ingest", {
          barcode_string: text,
          enrich: true,
        });
        setPreview(data);
        setStatus("preview");
        loadHistory();
      } catch (e) {
        setError(e?.response?.data?.detail || "Could not parse the barcode.");
        setStatus("error");
      }
    };
    try {
      stopScannerRef.current = startLiveScanner(videoRef.current, onResult);
    } catch (err) {
      toast.error(err.message);
      setLiveScanning(false);
    }
    return () => stopLiveScan();
  }, [liveScanning, stopLiveScan]);

  useEffect(() => {
    if (!manualOpen || !mAirline?.iata) {
      setMFlightOptions([]);
      return;
    }
    let alive = true;
    api.get("/flights/search", {
      params: { airline_iata: mAirline.iata, q: mFlightNumber, limit: 8 },
    }).then(({ data }) => {
      if (alive) setMFlightOptions(data || []);
    }).catch(() => {
      if (alive) setMFlightOptions([]);
    });
    return () => { alive = false; };
  }, [manualOpen, mAirline?.iata, mFlightNumber]);

  const handleImages = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setError(null);
    setUploadType("image");
    setStatus("reading");
    try {
      const results = [];
      for (const file of list) {
        let barcodeText = "";
        let visibleText = "";
        try {
          const decoded = await decodeBarcodeFromFile(file);
          barcodeText = decoded.text || "";
        } catch {
          toast.info("Barcode was hard to read. Reading the visible boarding pass text instead.");
        }
        try {
          visibleText = await ocrImageFile(file);
        } catch {
          visibleText = "";
        }
        const text = [barcodeText, visibleText].join("\n").trim();
        if (!text) throw new Error("Couldn't read any ticket text from this image.");
        const imageBase64 = await fileToBase64(file);
        setStatus("looking_up");
        const { data } = await api.post("/boarding-pass/ingest", {
          barcode_string: barcodeText || visibleText,
          visible_text: visibleText,
          image_base64: imageBase64,
          original_filename: file.name,
          enrich: true,
        });
        results.push(data);
      }
      setPreview(mergeImportResults(results));
      setStatus("preview");
      setUploadType(null);
      loadHistory();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Couldn't read the boarding pass. Try a clearer photo or paste the code below.");
      setStatus("error");
      setUploadType(null);
    }
  };

  const handlePdfs = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setError(null);
    setUploadType("pdf");
    setStatus("reading");
    try {
      const results = [];
      for (const file of list) {
        const form = new FormData();
        form.append("file", file);
        setStatus("looking_up");
        const { data } = await api.post("/pdf/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        results.push(data);
      }
      const merged = mergeImportResults(results);
      if (!merged.segments.length) {
        setPreview(null);
        setError(merged.parse_message || "No flight details were found in this PDF. Try a clearer ticket or add the flight manually.");
        setStatus("error");
        setUploadType(null);
        loadHistory();
        toast.info("No flight details found in this PDF.");
        return;
      }
      setPreview(merged);
      setStatus("preview");
      setUploadType(null);
      loadHistory();
      if (merged.segments.some((s) => (s.confidence_score ?? 0) < 0.6 || (s.missing_fields || []).length > 0)) {
        toast.info("Found some flight details. A quick review makes it perfect.");
      }
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't read that PDF. Try uploading a cleaner ticket.");
      setStatus("error");
      setUploadType(null);
    }
  };



  const handleBarcodePaste = async () => {
    if (!pasteText.trim()) return;
    setError(null);
    setStatus("looking_up");
    setPasteOpen(false);
    try {
      const { data } = await api.post("/boarding-pass/ingest", {
        barcode_string: pasteText.trim(),
        enrich: true,
      });
      setPreview(data);
      setStatus("preview");
      loadHistory();
      setPasteText("");
    } catch (e) {
      setError(e?.response?.data?.detail || "That didn't look like a valid boarding pass code.");
      setStatus("error");
    }
  };

  const fetchManualDetails = async () => {
    if (!mAirline?.iata || !mFlightNumber.trim()) {
      toast.error("Please select an airline and enter a flight number.");
      return;
    }
    setMFetching(true);
    try {
      const { data } = await api.get("/flights/lookup", {
        params: { airline_iata: mAirline.iata, flight_number: mFlightNumber.trim(), date: mDate },
      });
      setMFetched(data);
      if (data.found) {
        toast.success("Flight details fetched.");
        // Preset airports if enrichment found them
        if (data.flight.departure_airport_iata && !mFrom) {
          setMFrom({ iata: data.flight.departure_airport_iata, city: data.flight.departure_city_name });
        }
        if (data.flight.arrival_airport_iata && !mTo) {
          setMTo({ iata: data.flight.arrival_airport_iata, city: data.flight.arrival_city_name });
        }
        if (data.flight.aircraft_type || data.source === "local_catalog") setMSelectedFlight(data.flight);

        const depTime = data.flight.local_departure_time || (data.flight.departure_time_local ? data.flight.departure_time_local.slice(11, 16) : "");
        const arrTime = data.flight.local_arrival_time || (data.flight.arrival_time_local ? data.flight.arrival_time_local.slice(11, 16) : "");
        if (depTime) setMDepTime(depTime);
        if (arrTime) setMArrTime(arrTime);
      } else {
        toast.info("Couldn't find this flight live. Fill in the remaining details below.");
      }
    } catch (e) {
      toast.error("Couldn't reach the flight service right now.");
    }
    setMFetching(false);
  };

  const saveManual = async () => {
    const from = mFrom?.iata || mFetched?.flight?.departure_airport_iata;
    const to = mTo?.iata || mFetched?.flight?.arrival_airport_iata;
    if (!mAirline?.iata || !mFlightNumber.trim() || !mDate || !from || !to) {
      toast.error("Airline, flight number, date, and route are required.");
      return;
    }
    setManualOpen(false);
    setStatus("looking_up");
    try {
      const depTime = mDepTime || mSelectedFlight?.local_departure_time || mFetched?.flight?.local_departure_time;
      let duration = mSelectedFlight?.flight_duration_minutes || mFetched?.flight?.flight_duration_minutes;
      if (mDepTime && mArrTime) {
        const [dh, dm] = mDepTime.split(":").map(Number);
        const [ah, am] = mArrTime.split(":").map(Number);
        let diff = (ah * 60 + am) - (dh * 60 + dm);
        if (diff < 0) diff += 24 * 60; // Next day arrival
        duration = diff;
      }
      const { data } = await api.post("/flights/manual", {
        airline_iata: mAirline.iata,
        flight_number: mFlightNumber.trim(),
        departure_airport_iata: from,
        arrival_airport_iata: to,
        flight_date: mDate,
        seat_number: mSeat || null,
        booking_reference: mPnr || null,
        passenger_name: mPassenger || null,
        flight_duration_minutes: duration,
        aircraft_type: mSelectedFlight?.aircraft_type || mFetched?.flight?.aircraft_type,
        local_departure_time: depTime,
      });
      setPreview(data);
      setStatus("preview");
      loadHistory();
      resetManualForm();
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't save.");
      setStatus("error");
    }
  };

  const resetManualForm = () => {
    setMAirline(null); setMFlightNumber(""); setMDate(""); setMFetched(null);
    setMFrom(null); setMTo(null); setMSeat(""); setMPnr(""); setMPassenger("");
    setMSelectedFlight(null); setMFlightOptions([]); setMDepTime(""); setMArrTime("");
  };

  const reviewIt = () => {
    const pending = previewSegments.find((s) => s?.status !== "confirmed" && s?.status !== "duplicate");
    if (pending?.id) navigate(`/review/${pending.id}`);
  };

  const isBusy = status === "reading" || status === "looking_up";
  const isImageBusy = isBusy && uploadType === "image";
  const isPdfBusy = isBusy && uploadType === "pdf";
  const previewSegments = preview?.segments || (preview?.segment ? [preview.segment] : []);

  const selectCatalogFlight = (flight) => {
    setMSelectedFlight(flight);
    setMFlightNumber(flight.flight_number || flight.number || "");
    setMFrom({ iata: flight.departure_airport_iata, city: flight.departure_city_name });
    setMTo({ iata: flight.arrival_airport_iata, city: flight.arrival_city_name });
    setMFetched({ found: true, source: "local_catalog", flight });
    if (flight.local_departure_time) {
      setMDepTime(flight.local_departure_time);
      const duration = flight.flight_duration_minutes || 90;
      const [h, m] = flight.local_departure_time.split(":").map(Number);
      const totalMinutes = (h * 60 + m + duration) % (24 * 60);
      const arrH = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
      const arrM = String(totalMinutes % 60).padStart(2, "0");
      setMArrTime(`${arrH}:${arrM}`);
    }
    toast.success(`${flight.flight_number || flight.number} route pre-filled.`);
  };

  const hasCamera = isCameraAvailable();

  const onboardingTitle = (
    <span className="flex items-center gap-1.5">
      Let's add your first flight
      <motion.div animate={{ y: [0, -3, 0], opacity: [0.7, 1, 0.7], rotate: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
        <PlaneTakeoff size={15} className="text-primary" />
      </motion.div>
    </span>
  );

  return (
    <Shell title={isOnboarding ? onboardingTitle : "Add a flight"} hideNav={isOnboarding}>
      <div className="p-4 pb-10 flex flex-col gap-5 animate-fade-up" data-testid="import-page">

        {/* Live Scanner Overlay */}
        {liveScanning && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col" data-testid="live-scanner">
            <div className="relative flex-1">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-48 border-2 border-primary/60 rounded-3xl">
                  <span className="absolute -top-px -left-px w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-3xl" />
                  <span className="absolute -top-px -right-px w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-3xl" />
                  <span className="absolute -bottom-px -left-px w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-3xl" />
                  <span className="absolute -bottom-px -right-px w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-3xl" />
                  <span className="absolute left-4 right-4 top-1/2 h-px bg-primary/60 animate-pulse" />
                </div>
              </div>
              <div className="absolute top-4 left-0 right-0 text-center">
                <p className="text-white text-sm font-medium drop-shadow">Point camera at boarding pass barcode</p>
              </div>
            </div>
            <div className="p-4 pb-8 flex justify-center">
              <button onClick={stopLiveScan} className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white">
                <X size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Main scan options */}
        <div className="grid grid-cols-2 gap-3">
          {hasCamera && (
            <button
              onClick={startLiveScan}
              disabled={isBusy}
              className="tl-card tl-card-intense tl-card-interactive aspect-[4/3] flex flex-col items-center justify-center gap-3 border-2 border-primary/40 hover:border-primary/70 transition shadow-[0_0_18px_-4px_hsl(var(--primary)/0.35)] animate-pulse-subtle"
              data-testid="live-scan-btn"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/12 text-primary flex items-center justify-center">
                <Video size={20} strokeWidth={2.2} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Live scan</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Real-time camera</p>
              </div>
            </button>
          )}
          <button
            onClick={() => !isBusy && imgRef.current?.click()}
            disabled={isBusy}
            className={`tl-card tl-card-intense tl-card-interactive ${hasCamera ? 'aspect-[4/3]' : 'aspect-[2/1] col-span-2'} flex flex-col items-center justify-center gap-3 border-2 border-primary/40 hover:border-primary/70 transition shadow-[0_0_18px_-4px_hsl(var(--primary)/0.35)] animate-pulse-subtle`}
            data-testid="upload-cta"
          >
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              data-testid="file-input"
              onChange={(e) => handleImages(e.target.files)}
            />
            {isImageBusy ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs font-medium">{status === "reading" ? "Reading…" : "Looking up…"}</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-primary/12 text-primary flex items-center justify-center">
                  <Camera size={20} strokeWidth={2.2} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Photo / Upload</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Boarding pass image</p>
                </div>
              </>
            )}
          </button>
        </div>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => !isBusy && pdfRef.current?.click()}
            disabled={isBusy}
            className="tl-card tl-card-interactive p-3 flex items-center justify-center gap-2 hover:border-primary/50 transition disabled:opacity-50"
            data-testid="upload-pdf-btn"
          >
            {isPdfBusy ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="font-medium">{status === "reading" ? "Reading PDF…" : "Parsing PDF…"}</span>
              </>
            ) : (
              <>
                <FileText size={14} />
                <span className="font-medium">Got an e-ticket?</span>
              </>
            )}
          </button>
          <input
            ref={pdfRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            data-testid="pdf-input"
            onChange={(e) => handlePdfs(e.target.files)}
          />
          <button
            onClick={() => setManualOpen(true)}
            className="tl-card tl-card-interactive p-3 flex items-center justify-center gap-2 hover:border-primary/50 transition"
            data-testid="manual-entry-btn"
          >
            <PenLine size={14} /> <span className="font-medium">I know my flight</span>
          </button>
        </div>

        <button
          onClick={() => setPasteOpen(true)}
          className="text-[11px] text-muted-foreground underline underline-offset-4 self-center"
          data-testid="paste-barcode-fallback"
        >
          Have a barcode string? Paste it here
        </button>

        {error && (
          <div className="tl-card p-3 flex items-start gap-3 border-destructive/40 bg-destructive/5" data-testid="error-banner">
            <AlertTriangle size={16} className="text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-medium text-destructive">Something didn't work</p>
              <p className="text-muted-foreground mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Preview card */}
        {previewSegments.length > 0 && (
          <div className="flex flex-col gap-3 animate-fade-up" data-testid="preview-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-primary" />
                <p className="text-sm font-medium">
                  Got it — {previewSegments.length === 1 ? "here's your flight" : `${previewSegments.length} flights found`}
                </p>
              </div>
              {(preview.auto_confirmed > 0 || preview.enrichment_applied) && (
                <span className="tl-iata-pill text-[10px] !bg-primary/15 !text-primary !border-primary/30 inline-flex items-center gap-1">
                  <Sparkles size={10} /> {preview.auto_confirmed > 0 ? `${preview.auto_confirmed} saved` : "live"}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {previewSegments.map((seg) => (
                <div key={seg.id} className="flex flex-col gap-2">
                  <BoardingPassCard
                    flight={seg}
                    footerRight={seg.status === "confirmed" ? (
                      <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] uppercase tracking-wider">saved</span>
                    ) : null}
                  />
                  {(seg.parse_message || (seg.missing_fields || []).length > 0) && (
                    <div className="tl-card p-3 text-xs border-amber-500/30 bg-amber-500/5">
                      <p className="font-medium text-amber-300">{seg.parse_message || "Review recommended"}</p>
                      {(seg.missing_fields || []).length > 0 && (
                        <p className="text-muted-foreground mt-1">Needs: {seg.missing_fields.map(friendlyField).join(", ")}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={reviewIt}
                disabled={!previewSegments.some((s) => s.status !== "confirmed" && s.status !== "duplicate")}
                className="flex-1 tl-btn-primary flex items-center justify-center gap-1.5 text-sm"
                data-testid="review-edit-btn"
              >
                <CheckCircle2 size={14} /> Review and save
              </button>
            </div>
          </div>
        )}

        {/* Upload history */}
        {history.length > 0 && (
          <div className="flex flex-col gap-2" data-testid="history-section">
            <div className="flex items-center gap-2 text-muted-foreground mt-2">
              <History size={13} />
              <p className="text-[10px] uppercase tracking-[0.22em]">Recent additions</p>
            </div>
            <ul className="flex flex-col gap-2">
              {history.slice(0, 6).map((a) => (
                <li key={a.id} className="tl-card p-3 flex items-center justify-between text-xs" data-testid={`artifact-row-${a.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${a.parser_status === "parsed" ? "bg-primary" : "bg-amber-500"}`} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.display_title || a.original_filename || "Pasted code"}</p>
                      <p className="text-[10px] text-muted-foreground tl-mono">{fmtDate(a.created_at)}</p>
                    </div>
                  </div>
                  <SourceLabel type={a.source_type} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Paste boarding pass code dialog */}
      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Paste the boarding pass code</DialogTitle>
            <DialogDescription>The text usually starts with "M1" — you'll find it behind most airline barcodes.</DialogDescription>
          </DialogHeader>
          <Textarea
            data-testid="paste-textarea"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            placeholder="M1KUMAR/SUBA          EABC123 BOMDELAI 0101 226Y012A…"
            className="tl-mono text-xs"
          />
          <DialogFooter>
            <button onClick={handleBarcodePaste} className="tl-btn-primary w-full" data-testid="paste-submit-btn">
              Add flight
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add-by-flight-number dialog */}
      <Dialog open={manualOpen} onOpenChange={(v) => { if (!v) resetManualForm(); setManualOpen(v); }}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add a flight</DialogTitle>
            <DialogDescription>Select an airline, enter your flight number, and we'll fill in the rest.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Step 1: Airline */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted-foreground font-medium">Airline</label>
              <Autocomplete
                kind="airline"
                value={mAirline}
                onSelect={(it) => { setMAirline(it); setMSelectedFlight(null); setMFetched(null); }}
                placeholder="Air India, IndiGo, Emirates…"
                testId="manual-airline-ac"
                renderItem={(item) => (
                  <>
                    <AirlineLogo iata={item.iata} size={24} />
                    <span className="tl-iata-pill !text-xs">{item.iata}</span>
                    <p className="text-sm font-medium truncate">{item.name}</p>
                  </>
                )}
              />
            </div>

            {/* Step 2: Flight number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted-foreground font-medium">Flight number</label>
              <Input
                data-testid="manual-flight-number"
                placeholder={mAirline ? `e.g. ${mAirline.iata}505` : "e.g. AI505"}
                value={mFlightNumber}
                onChange={(e) => { setMFlightNumber(e.target.value); setMSelectedFlight(null); setMFetched(null); }}
                autoComplete="off"
              />
            </div>

            {/* Route suggestions from catalog */}
            {mAirline && mFlightOptions.length > 0 && !mFetched && (
              <div className="flex flex-col gap-1.5 max-h-36 overflow-auto no-scrollbar">
                {mFlightOptions.map((flight) => (
                  <button
                    key={`${flight.airline_iata}-${flight.number}-${flight.departure_airport_iata}`}
                    onClick={() => selectCatalogFlight(flight)}
                    className={`tl-card tl-card-interactive text-left p-2.5 flex items-center gap-3 text-xs ${mSelectedFlight?.flight_number === flight.flight_number ? "border-primary/50 bg-primary/5" : ""}`}
                  >
                    <AirlineLogo iata={flight.airline_iata || mAirline.iata} size={20} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{flight.flight_number || flight.number} · {flight.departure_airport_iata} → {flight.arrival_airport_iata}</p>
                      <p className="text-[10px] text-muted-foreground">{flight.departure_city_name} → {flight.arrival_city_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Fetch button */}
            {mAirline && mFlightNumber && !mFetched && (
              <button
                onClick={fetchManualDetails}
                disabled={!mAirline || !mFlightNumber || mFetching}
                className="w-full py-2.5 rounded-xl border border-primary/40 text-primary font-medium text-sm hover:bg-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="fetch-flight-btn"
              >
                {mFetching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {mFetching ? "Fetching…" : "Fetch route details"}
              </button>
            )}

            {/* Fetched result */}
            {mFetched?.found && (
              <div className="tl-card p-3 text-xs border-primary/30 bg-primary/5" data-testid="fetch-result">
                <p className="text-primary font-medium flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={12} /> Route confirmed
                </p>
                <p className="text-foreground font-semibold">
                  {mFetched.flight.departure_city_name} ({mFetched.flight.departure_airport_iata}) → {mFetched.flight.arrival_city_name} ({mFetched.flight.arrival_airport_iata})
                </p>
              </div>
            )}

            {/* Step 3: Route (manual if not fetched) */}
            {(!mFetched?.found && mFetched) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-muted-foreground font-medium">From</label>
                  <Autocomplete kind="airport" value={mFrom} onSelect={setMFrom} testId="manual-from-ac" placeholder="City or IATA" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-muted-foreground font-medium">To</label>
                  <Autocomplete kind="airport" value={mTo} onSelect={setMTo} testId="manual-to-ac" placeholder="City or IATA" />
                </div>
              </div>
            )}

            {/* Step 4: Date & Time */}
            {(mFetched?.found || mFrom || mTo || (mAirline && mFlightNumber)) && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label className="text-[10px] text-muted-foreground font-medium">Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-xs text-left justify-between items-center focus:outline-none focus:ring-1 focus:ring-ring ${mDate ? "text-foreground" : "text-muted-foreground"}`}
                          data-testid="manual-date"
                        >
                          <span>{mDate ? format(parse(mDate, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : "Select date"}</span>
                          <CalendarDays size={13} className="text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={mDate ? parse(mDate, "yyyy-MM-dd", new Date()) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setMDate(format(date, "yyyy-MM-dd"));
                            } else {
                              setMDate("");
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium"><Clock size={9} /> Departure</label>
                    <Input data-testid="manual-dep-time" type="time" value={mDepTime} onChange={(e) => setMDepTime(e.target.value)} placeholder="09:00" autoComplete="off" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium"><Clock size={9} /> Arrival</label>
                    <Input data-testid="manual-arr-time" type="time" value={mArrTime} onChange={(e) => setMArrTime(e.target.value)} placeholder="12:30" autoComplete="off" />
                  </div>
                </div>

                {/* Step 5: Optional details */}
                <div className="grid grid-cols-2 gap-2">
                  <Input data-testid="manual-pnr" placeholder="PNR / Booking ref" value={mPnr} onChange={(e) => setMPnr(e.target.value)} autoComplete="off" />
                  <Input data-testid="manual-seat" placeholder="Seat (optional)" value={mSeat} onChange={(e) => setMSeat(e.target.value)} autoComplete="off" />
                </div>
                <Input data-testid="manual-passenger" placeholder="Passenger name (optional)" value={mPassenger} onChange={(e) => setMPassenger(e.target.value)} autoComplete="off" />
              </>
            )}
          </div>

          <DialogFooter>
            <button onClick={saveManual} className="tl-btn-primary w-full" data-testid="manual-submit-btn">
              Add to Flight Timeline
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
