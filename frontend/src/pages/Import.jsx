import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Camera, Loader2, AlertTriangle, CheckCircle2,
  PenLine, History, FileText, Sparkles, X, Clock,
  PlaneTakeoff, Video, QrCode, UploadCloud,
} from "lucide-react";
import Shell from "@/components/shell/Shell";
import BoardingPassCard from "@/components/BoardingPassCard";
import AirlineLogo from "@/components/AirlineLogo";
import Autocomplete from "@/components/Autocomplete";
import { AIRPORTS } from "@/data/airports";
import { decodeBarcodeFromFile, fileToBase64, startLiveScanner, isCameraAvailable } from "@/lib/barcode";
import { ocrImageFile, extractPdfText, loadPdfJsFromCdn } from "@/lib/ticketText";
import { parseTicketText } from "@/lib/ticketParser";
import { Confetti } from "@/components/ui/Confetti";
import { AnimatedBarcodeIcon, AnimatedUploadIcon, AnimatedPlaneIcon, AnimatedSuccessIcon, AnimatedManualEntryIcon, FlightLoadingAnimation } from "@/components/ui/AnimatedIcons";
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
  const { user, profile } = useAuth();
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | reading | looking_up | preview | error
  const [uploadType, setUploadType] = useState(null); // null | "image" | "pdf"
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  const handleFileSelection = (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const isPdf = list.some(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (isPdf) {
      handlePdfs(list);
    } else {
      handleImages(list);
    }
  };


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
  const [mAircraftType, setMAircraftType] = useState("");
  const [mSelectedFlight, setMSelectedFlight] = useState(null);

  const mSegment = {
    airline_iata: mAirline?.iata || "",
    airline_name: mAirline?.name || "",
    flight_number: mFlightNumber || "",
    flight_date: mDate || "",
    departure_airport_iata: mFrom?.iata || "",
    departure_city_name: mFrom?.city || "",
    arrival_airport_iata: mTo?.iata || "",
    arrival_city_name: mTo?.city || "",
    departure_time_local: mDepTime || "",
    arrival_time_local: mArrTime || "",
    seat_number: mSeat || "",
    booking_reference: mPnr || "",
    pnr: mPnr || "",
    passenger_name: mPassenger || "",
    aircraft_type: mAircraftType || "",
  };

  const handleManualCardChange = (updated) => {
    if (updated.flight_date !== undefined) setMDate(updated.flight_date);
    if (updated.departure_time_local !== undefined) setMDepTime(updated.departure_time_local);
    if (updated.arrival_time_local !== undefined) setMArrTime(updated.arrival_time_local);
    if (updated.seat_number !== undefined) setMSeat(updated.seat_number);
    if (updated.booking_reference !== undefined) {
      setMPnr(updated.booking_reference);
    } else if (updated.pnr !== undefined) {
      setMPnr(updated.pnr);
    }
    if (updated.passenger_name !== undefined) setMPassenger(updated.passenger_name);
    if (updated.aircraft_type !== undefined) setMAircraftType(updated.aircraft_type);
    
    if (updated.departure_airport_iata !== undefined) {
      const code = String(updated.departure_airport_iata).toUpperCase().slice(0, 3);
      const port = AIRPORTS[code];
      setMFrom({ iata: code, city: port ? port.city : code });
    }
    if (updated.arrival_airport_iata !== undefined) {
      const code = String(updated.arrival_airport_iata).toUpperCase().slice(0, 3);
      const port = AIRPORTS[code];
      setMTo({ iata: code, city: port ? port.city : code });
    }
    if (updated.airline_iata !== undefined) {
      const code = String(updated.airline_iata).toUpperCase().slice(0, 2);
      setMAirline({ iata: code, name: code });
    }
    if (updated.flight_number !== undefined) {
      setMFlightNumber(updated.flight_number);
    }
  };

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
        setShowConfetti(true);
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
      setShowConfetti(true);
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
        const pdfjs = await loadPdfJsFromCdn();
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
        
        let barcodeResult = null;
        const maxPages = Math.min(pdf.numPages, 3);
        
        // Scan for barcodes in the first 3 pages
        for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
          try {
            const page = await pdf.getPage(pageNo);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d", { willReadFrequently: true });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;
            
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
            if (blob) {
              const decoded = await decodeBarcodeFromFile(blob);
              if (decoded?.text) {
                barcodeResult = decoded.text;
                break;
              }
            }
          } catch (e) {
            console.log(`No barcode found on PDF page ${pageNo}:`, e);
          }
        }
        
        let data;
        if (barcodeResult) {
          toast.success("Boarding pass barcode decoded successfully!");
          setStatus("looking_up");
          const res = await api.post("/boarding-pass/ingest", {
            barcode_string: barcodeResult,
            enrich: true,
          });
          data = res.data;
        } else {
          toast.info("No barcode found. Extracting text to parse details...");
          setStatus("looking_up");
          const extractedText = await extractPdfText(file, { ocrFallback: true });
          
          if (!extractedText || extractedText.length < 15) {
            throw new Error("We couldn't read any flight information from this document.");
          }
          
          const parsed = await parseTicketText(extractedText, "boarding_pass_ocr");
          
          if (!parsed?.segments?.length) {
            throw new Error(parsed?.message || "No flight details were found in this document.");
          }
          
          data = {
            artifact: null,
            segment: parsed.segments[0],
            segments: parsed.segments,
            auto_confirmed: parsed.parser_status === "parsed" ? 1 : 0,
            duplicates: 0,
            enrichment_applied: true,
            parse_confidence: parsed.parser_status === "parsed" ? 0.98 : 0.65,
            parse_message: parsed.message || null,
          };
        }
        
        results.push(data);
      }
      
      const merged = mergeImportResults(results);
      if (!merged.segments.length) {
        setPreview(null);
        setError(merged.parse_message || "No flight details were found in this PDF. Try a clearer boarding pass or add the flight manually.");
        setStatus("error");
        setUploadType(null);
        loadHistory();
        toast.info("No flight details found in this PDF.");
        return;
      }
      
      setPreview(merged);
      setStatus("preview");
      setShowConfetti(true);
      setUploadType(null);
      loadHistory();
      
      if (merged.segments.some((s) => (s.confidence_score ?? 0) < 0.6 || (s.missing_fields || []).length > 0)) {
        toast.info("Found some flight details. A quick review makes it perfect.");
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || "Couldn't read that PDF. Try uploading a cleaner boarding pass.");
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
      setShowConfetti(true);
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
      if (data.found && data.flight) {
        toast.success("Flight details fetched.");
        if (data.flight.departure_airport_iata) {
          setMFrom({ iata: data.flight.departure_airport_iata, city: data.flight.departure_city_name || data.flight.departure_airport_iata });
        }
        if (data.flight.arrival_airport_iata) {
          setMTo({ iata: data.flight.arrival_airport_iata, city: data.flight.arrival_city_name || data.flight.arrival_airport_iata });
        }
        setMSelectedFlight(data.flight);
        if (data.flight.aircraft_type) {
          setMAircraftType(data.flight.aircraft_type);
        }

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
        aircraft_type: mAircraftType || mSelectedFlight?.aircraft_type || mFetched?.flight?.aircraft_type || null,
        local_departure_time: depTime,
      });
      setPreview(data);
      setStatus("preview");
      setShowConfetti(true);
      loadHistory();
      resetManualForm();
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't save.");
      setStatus("error");
    }
  };

  const resetManualForm = () => {
    setMAirline(null); setMFlightNumber(""); setMDate(""); setMFetched(null);
    setMFrom(null); setMTo(null); setMSeat(""); setMPnr(""); 
    setMSelectedFlight(null); setMDepTime(""); setMArrTime("");
    setMAircraftType("");
  };

  const confirmAndSave = async () => {
    const pending = previewSegments.filter(s => s.status !== "confirmed" && s.status !== "duplicate");
    setStatus("looking_up");
    try {
      for (const seg of pending) {
        let finalDuration = seg.flight_duration_minutes;
        if (!finalDuration && seg.departure_time_local && seg.arrival_time_local) {
          const depDate = new Date(seg.departure_time_local);
          const arrDate = new Date(seg.arrival_time_local);
          if (!isNaN(depDate) && !isNaN(arrDate)) {
            finalDuration = Math.round((arrDate - depDate) / 60000);
            if (finalDuration < 0) finalDuration += 24 * 60;
          } else if (typeof seg.departure_time_local === "string" && typeof seg.arrival_time_local === "string") {
            const depParts = seg.departure_time_local.match(/(\d{2}):(\d{2})/);
            const arrParts = seg.arrival_time_local.match(/(\d{2}):(\d{2})/);
            if (depParts && arrParts) {
              const dh = parseInt(depParts[1], 10);
              const dm = parseInt(depParts[2], 10);
              const ah = parseInt(arrParts[1], 10);
              const am = parseInt(arrParts[2], 10);
              let diff = (ah * 60 + am) - (dh * 60 + dm);
              if (diff < 0) diff += 24 * 60;
              finalDuration = diff;
            }
          }
        }
        await api.post(`/segments/${seg.id}/confirm`, { ...seg, flight_duration_minutes: finalDuration });
      }
      setPreview(null);
      setStatus("idle");
      navigate("/timeline");
      toast.success("Saved to timeline!");
    } catch (e) {
      toast.error("Failed to save some flights.");
      setStatus("preview");
    }
  };

  const isBusy = status === "reading" || status === "looking_up";
  const isImageBusy = isBusy && uploadType === "image";
  const isPdfBusy = isBusy && uploadType === "pdf";
  const previewSegments = preview?.segments || (preview?.segment ? [preview.segment] : []);

  const selectCatalogFlight = (flight) => {
    setMSelectedFlight(flight);
    setMFlightNumber(flight.flight_number || flight.number || "");
    if (flight.airline_iata) {
      setMAirline({ iata: flight.airline_iata, name: flight.airline_name || flight.airline_iata });
    }
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
    if (flight.aircraft_type) {
      setMAircraftType(flight.aircraft_type);
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
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <div className="p-4 pb-10 flex flex-col gap-5 animate-fade-up" data-testid="import-page">

        {/* Live Scanner Overlay */}
        {liveScanning && (
          <div className="absolute inset-0 z-50 bg-black rounded-[inherit] flex flex-col" data-testid="live-scanner">
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

        {/* Preview overlay modal */}
        {previewSegments.length > 0 && (
          <div className="fixed inset-0 bg-background/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-card border border-border/80 rounded-[32px] p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl flex flex-col gap-4 animate-fade-up relative">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-primary" />
                  <p className="text-sm font-medium text-foreground">
                    Got it — {previewSegments.length === 1 ? "here's your flight" : `${previewSegments.length} flights found`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(preview.auto_confirmed > 0 || preview.enrichment_applied) && (
                    <span className="tl-iata-pill text-[10px] !bg-primary/15 !text-primary !border-primary/30 inline-flex items-center gap-1">
                      <Sparkles size={10} /> {preview.auto_confirmed > 0 ? `${preview.auto_confirmed} saved` : "live"}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setPreview(null);
                      if (isOnboarding) {
                        navigate("/timeline");
                      }
                    }}
                    className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
                    title="Dismiss"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {previewSegments.map((seg) => (
                  <div key={seg.id} className="flex flex-col gap-2">
                    <BoardingPassCard
                      flight={seg}
                      isEditable={seg.status !== "confirmed" && seg.status !== "duplicate"}
                      editMode="timings_only"
                      onChange={(updatedSeg) => {
                        setPreview(prev => {
                          if (!prev) return prev;
                          const updatedSegments = (prev.segments || [prev.segment]).map(s => 
                            s.id === updatedSeg.id ? updatedSeg : s
                          );
                          return { ...prev, segments: updatedSegments, segment: updatedSegments[0] };
                        });
                      }}
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
              <div className="flex gap-2 border-t border-border pt-4 mt-2">
                <button
                  onClick={confirmAndSave}
                  disabled={!previewSegments.some((s) => s.status !== "confirmed" && s.status !== "duplicate") || isBusy}
                  className="flex-1 tl-btn-primary flex items-center justify-center gap-1.5 text-sm py-2.5"
                  data-testid="review-edit-btn"
                >
                  {isBusy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 
                  {isBusy ? "Saving..." : "Save to Timeline"}
                </button>
              </div>
            </div>
          </div>
        )}

        {manualOpen ? (
          <div className="tl-card p-5 flex flex-col gap-4 animate-fade-up" data-testid="manual-entry-form">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <PenLine size={16} className="text-primary" />
                <h2 className="text-base font-bold text-foreground">Add Flight Manually</h2>
              </div>
              <button
                onClick={() => { setManualOpen(false); resetManualForm(); }}
                className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-5 bg-background p-4 rounded-2xl border border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Airline Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Airline</label>
                  <div className="h-[46px] relative">
                    <Autocomplete
                      kind="airline"
                      value={mAirline}
                      onSelect={(airline) => {
                        setMAirline(airline);
                        if (airline?.iata) {
                          if (!mFlightNumber || !mFlightNumber.startsWith(airline.iata)) {
                            setMFlightNumber(airline.iata);
                          }
                        }
                      }}
                      testId="manual-airline"
                      className="w-full h-full text-base"
                    />
                  </div>
                </div>

                {/* Flight Number Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Flight Number</label>
                  <div className="h-[46px] relative">
                    <Autocomplete
                      kind="flight"
                      value={mSelectedFlight || mFlightNumber}
                      onSelect={selectCatalogFlight}
                      onTextChange={(val) => {
                        setMFlightNumber(val);
                        setMSelectedFlight(null);
                      }}
                      extraParams={{ airline_iata: mAirline?.iata }}
                      placeholder="e.g. 101"
                      testId="manual-flight-number"
                      className="w-full h-full text-base"
                    />
                  </div>
                </div>

                {/* Date Picker Selection */}
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Flight Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center justify-between w-full h-[46px] px-3 bg-white border border-border/60 rounded-xl text-left text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 hover:border-border">
                        <span className={mDate ? "text-foreground font-semibold" : "text-muted-foreground"}>
                          {mDate ? format(parse(mDate, "yyyy-MM-dd", new Date()), "PPP") : "Select a date..."}
                        </span>
                        <CalendarDays size={18} className="text-muted-foreground" />
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
              </div>

              <button
                type="button"
                disabled={mFetching || !mAirline?.iata || !mFlightNumber.trim() || !mDate}
                onClick={fetchManualDetails}
                className="tl-btn-secondary px-6 flex items-center justify-center gap-2 text-sm font-bold h-[46px] w-full hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm"
                data-testid="manual-lookup-btn"
              >
                {mFetching ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Verify Flight Data
              </button>
            </div>

            {mFetching ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 border border-border/40 rounded-3xl bg-secondary/10">
                <FlightLoadingAnimation size={120} />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-1">Interactive Boarding Pass</p>
                <BoardingPassCard
                  flight={mSegment}
                  isEditable={true}
                  onChange={handleManualCardChange}
                />
              </div>
            )}

            <div className="flex gap-3 border-t border-border pt-4 mt-2">
              <button
                type="button"
                onClick={() => { setManualOpen(false); resetManualForm(); }}
                className="flex-1 tl-btn-secondary text-sm py-2.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveManual}
                disabled={!mAirline?.iata || !mFlightNumber.trim() || !mDate || !(mFrom?.iata || mFetched?.flight?.departure_airport_iata) || !(mTo?.iata || mFetched?.flight?.arrival_airport_iata)}
                className="flex-1 tl-btn-primary text-sm py-2.5"
                data-testid="manual-save-btn"
              >
                Save Flight
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Main premium 3-path ingestion options */}
            <div className="flex flex-col gap-4">
              {/* Pathway 1: Barcode Scan */}
              <button
                onClick={startLiveScan}
                disabled={isBusy}
                className="tl-card tl-card-intense tl-card-interactive flex flex-col items-center justify-center p-6 text-center border-2 border-primary/20 hover:border-primary/60 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_30px_-2px_rgba(37,99,235,0.3)] min-h-[175px] group relative overflow-hidden text-left"
                data-testid="live-scan-btn"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full pointer-events-none transition-all duration-300 group-hover:scale-110" />
                <div className="mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <AnimatedBarcodeIcon size={56} />
                </div>
                <h3 className="text-base font-bold tracking-tight text-foreground">Scan Barcode</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Live camera scanning of e-ticket or boarding pass barcodes</p>
                <span 
                  className="text-[10px] text-primary font-medium underline underline-offset-4 mt-3 block hover:text-primary z-10 relative cursor-pointer" 
                  onClick={(e) => { e.stopPropagation(); setPasteOpen(true); }}
                  data-testid="paste-barcode-fallback"
                >
                  Or paste barcode string
                </span>
              </button>

              {/* Pathway 2: Upload Boarding Pass (PDF / Image) */}
              <button
                onClick={() => !isBusy && fileInputRef.current?.click()}
                disabled={isBusy}
                className="tl-card tl-card-intense tl-card-interactive flex flex-col items-center justify-center p-6 text-center border-2 border-primary/20 hover:border-primary/60 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_30px_-2px_rgba(37,99,235,0.3)] min-h-[175px] group relative overflow-hidden"
                data-testid="upload-cta"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full pointer-events-none transition-all duration-300 group-hover:scale-110" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf,image/*"
                  multiple
                  className="hidden"
                  data-testid="file-input"
                  onChange={(e) => handleFileSelection(e.target.files)}
                />
                {isBusy && (uploadType === "image" || uploadType === "pdf") ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-sm font-semibold">{status === "reading" ? "Reading file..." : "Analyzing ticket..."}</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5">
                      <AnimatedUploadIcon size={56} />
                    </div>
                    <h3 className="text-base font-bold tracking-tight text-foreground">Upload Boarding Pass</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Drop or browse boarding pass PDFs, ticket images, or screenshots</p>
                    <span className="text-[10px] text-muted-foreground mt-3 font-mono">PDF, PNG, JPG, JPEG</span>
                  </>
                )}
              </button>

              {/* Pathway 3: Manual Flight Entry */}
              <button
                onClick={() => {
                  setManualOpen(true);
                  if (!mPassenger) {
                    setMPassenger(profile?.preferred_name || user?.name || "");
                  }
                }}
                disabled={isBusy}
                className="tl-card tl-card-intense tl-card-interactive flex flex-col items-center justify-center p-6 text-center border-2 border-primary/20 hover:border-primary/60 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_30px_-2px_rgba(37,99,235,0.3)] min-h-[175px] group relative overflow-hidden"
                data-testid="manual-entry-btn"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full pointer-events-none transition-all duration-300 group-hover:scale-110" />
                <div className="mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                  <AnimatedManualEntryIcon size={56} />
                </div>
                <h3 className="text-base font-bold tracking-tight text-foreground">Manual Entry</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Know your flight? Direct live lookup and step-by-step entry forms</p>
                <span className="text-[10px] text-primary font-medium underline underline-offset-4 mt-3 block hover:text-primary z-10 relative cursor-pointer">
                  Fill in details
                </span>
              </button>
            </div>

            {error && (
              <div className="tl-card p-3 flex items-start gap-3 border-destructive/40 bg-destructive/5" data-testid="error-banner">
                <AlertTriangle size={16} className="text-destructive mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-destructive">Something didn't work</p>
                  <p className="text-muted-foreground mt-0.5">{error}</p>
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
          </>
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


    </Shell>
  );
}
