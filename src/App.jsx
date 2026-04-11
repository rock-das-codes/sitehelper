import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Calendar, CheckCircle2, Search, Anchor, Hammer, HardHat, Building2, Columns2, FileDown, Loader2, Printer, Menu, X, BarChart3, ArrowRight, ArrowLeft } from 'lucide-react';

import { toCanvas, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import "./App.css"
const SECTION_URLS = {
  S1: import.meta.env.VITE_SHEET_URL_S1,
  S2: import.meta.env.VITE_SHEET_URL_S2,
  S3: import.meta.env.VITE_SHEET_URL_S3,
  S4: import.meta.env.VITE_SHEET_URL_S4,
};

// URL of the sheet tab that has the PM mapping table
// Columns expected: Section | Project Manager | Pier ID Range
// "Pier ID Range" can be  "21P01-21P40"  or  "21P01 to 21P40"  (both parsed)
const PM_SHEET_URL = import.meta.env.VITE_SHEET_URL_PM;

const isDrawingUnavailable = (status) => {
  if (!status) return false;
  const s = status.toString().toLowerCase().trim();
  return s === "not available" || s === "n/a" || s === "na" || s === "unavailable";
};

const getNormalizedLgDirection = (row) => {
  const raw =
    row['LG_Movement_Direction'] ||
    row['LG Movement Direction'] ||
    row['LG_DIRECTION'] ||
    row['LG Direction'] ||
    row['Movement Direction'] ||
    '';
  const s = raw.toString().trim().toLowerCase();
  if (!s) return null;

  // Explicit directional phrases from planning sheets.
  if (/(left\s*(to|->|→)\s*right|ltr|l\s*to\s*r)/i.test(s)) return 'right';
  if (/(right\s*(to|->|→)\s*left|rtl|r\s*to\s*l)/i.test(s)) return 'left';

  // Single-value variants.
  if (s === 'right' || s === 'r') return 'right';
  if (s === 'left' || s === 'l') return 'left';

  // Fallback for text containing only one side.
  const hasLeft = s.includes('left');
  const hasRight = s.includes('right');
  if (hasRight && !hasLeft) return 'right';
  if (hasLeft && !hasRight) return 'left';

  return null;
};

const parseDate = (dStr) => {
  if (!dStr) return null;
  const s = dStr.trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  const parts = s.split(/[-/.]/);
  if (parts.length === 3) {
    let p0 = parseInt(parts[0], 10);
    let p1 = parseInt(parts[1], 10);
    let p2 = parts[2];
    
    if (!isNaN(p0) && !isNaN(p1)) {
      if (p2.length === 4) {
        let year = parseInt(p2, 10);
        let day = p0;
        let month = p1;
        if (month > 12) {
          day = p1;
          month = p0;
        }
        return new Date(year, month - 1, day);
      } else if (p2.length === 2 && !isNaN(parseInt(p2, 10))) {
        let year = 2000 + parseInt(p2, 10);
        let day = p0;
        let month = p1;
        if (month > 12) {
          day = p1;
          month = p0;
        }
        return new Date(year, month - 1, day);
      }
    } else if (parts[0].length === 4) {
      let year = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      let day = parseInt(parts[2], 10);
      return new Date(year, month - 1, day);
    }
  }

  const d = new Date(s);
  if (!isNaN(d)) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  if (/^\d+$/.test(s)) {
    const serial = parseInt(s, 10);
    const excelEpoch = new Date(1899, 11, 30);
    const dateFromExcel = new Date(excelEpoch.getTime() + serial * 86400000);
    return new Date(dateFromExcel.getFullYear(), dateFromExcel.getMonth(), dateFromExcel.getDate());
  }
  
  return null;
};

const isCurrentMonth = (dStr) => {
  const d = parseDate(dStr);
  if (!d) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const isPreviousDay = (dStr) => {
  const d = parseDate(dStr);
  if (!d) return false;
  const prev = new Date();
  prev.setDate(prev.getDate() - 1);
  return d.getDate() === prev.getDate() && d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
};

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT MANAGER CONFIGURATION
// Edit the name, startPier, and endPier for each PM below.
// Pier IDs must exactly match the values in your Google Sheet.
// Add or remove entries as needed. Sections S1–S4 are supported.
// ─────────────────────────────────────────────────────────────────────────────
const PROJECT_MANAGERS = {
  S1: [
    { id: 'S1-PM1', name: 'PM 1', startPier: '21P01', endPier: '21P20' },
    { id: 'S1-PM2', name: 'PM 2', startPier: '21P21', endPier: '21P40' },
    { id: 'S1-PM3', name: 'PM 3', startPier: '21P41', endPier: '21P60' },
    { id: 'S1-PM4', name: 'PM 4', startPier: '21P61', endPier: '52P99' },
  ],
  S2: [
    { id: 'S2-PM1', name: 'PM 1', startPier: '85P08', endPier: '96P26' },
    { id: 'S2-PM2', name: 'PM 2', startPier: '97P01', endPier: '110P25' },
    { id: 'S2-PM3', name: 'PM 3', startPier: '111P01', endPier: '120P26' },
    { id: 'S2-PM4', name: 'PM 4', startPier: '121P01', endPier: '125P17' },
  ],
  S3: [
    { id: 'S3-PM1', name: 'PM 1', startPier: '127P15', endPier: '134P25' },
    { id: 'S3-PM2', name: 'PM 2', startPier: '135P01', endPier: '143P25' },
    { id: 'S3-PM3', name: 'PM 3', startPier: '144P01', endPier: '150P25' },
    { id: 'S3-PM4', name: 'PM 4', startPier: '151P01', endPier: '156P15' },
  ],
  S4: [
    { id: 'S4-PM1', name: 'PM 1', startPier: '53P01', endPier: '62P22' },
    { id: 'S4-PM2', name: 'PM 2', startPier: '63P01', endPier: '72P25' },
    { id: 'S4-PM3', name: 'PM 3', startPier: '73P01', endPier: '80P26' },
    { id: 'S4-PM4', name: 'PM 4', startPier: '81P01', endPier: '85P08' },
  ],
};


export default function BridgeDashboard() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [activeSection, setActiveSection] = useState("S1");
  const [showStats, setShowStats] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [selectedPM, setSelectedPM] = useState("");
  // pmsBySection: { S1: [{id, name, startPier, endPier}], S2: [...], ... }
  const [pmsBySection, setPmsBySection] = useState(PROJECT_MANAGERS);
  const [isPmLoading, setIsPmLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [isLoading, setIsLoading] = useState(false);


  // Fetch PM mapping from sheet on mount (once)
  useEffect(() => {
    if (!PM_SHEET_URL) return; // no URL configured → use hardcoded fallback
    setIsPmLoading(true);
    const cacheBuster = `&t=${new Date().getTime()}`;
    const pmUrl = PM_SHEET_URL.includes('?') ? `${PM_SHEET_URL}${cacheBuster}` : `${PM_SHEET_URL}?${cacheBuster}`;
    Papa.parse(pmUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Build pmsBySection from rows like: { Section, "Project Manager", "Pier ID Range" }
        const bySection = { S1: [], S2: [], S3: [], S4: [] };
        results.data.forEach((row, idx) => {
          let section = (row['Section'] || row['SECTION'] || '').trim().toUpperCase();
          // Normalize: "1" -> "S1", "2" -> "S2", etc.
          if (section && !section.startsWith('S') && /^\d+$/.test(section)) {
            section = `S${section}`;
          }
          
          const pmName  = (row['Project Manager'] || row['PROJECT MANAGER'] || row['Project Manage'] || '').trim();
          const range   = (row['Pier ID Range'] || row['PIER ID RANGE'] || '').trim();
          
          if (!section || !pmName || !range) return;
          
          // Parse range: supports "21P01-21P40", "21P01 to 21P40", "21P01 – 21P40"
          const parts = range.split(/\s*(?:to|-|–|—|TO)\s*/i).map(s => s.trim());
          const startPier = parts[0] || '';
          const endPier   = parts[1] || parts[0] || '';
          
          if (!bySection[section]) bySection[section] = [];
          bySection[section].push({
            id: `${section}-PM${idx + 1}`,
            name: pmName,
            startPier,
            endPier,
          });
        });
        setPmsBySection(bySection);
        setIsPmLoading(false);
      },
      error: () => setIsPmLoading(false),
    });
  }, []);

  // Fetch section data when activeSection changes
  useEffect(() => {
    setSelectedPM(""); // Reset PM selection when switching section
    const url = SECTION_URLS[activeSection];
    if (url) {
      setIsLoading(true);
      const cacheBuster = `&t=${new Date().getTime()}`;
      const finalUrl = url.includes('?') ? `${url}${cacheBuster}` : `${url}?${cacheBuster}`;
      
      // Force bypass cache with fetch
      fetch(finalUrl, { 
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      })
      .then(response => response.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setData(results.data);
            setLastUpdated(new Date());
            setIsLoading(false);
          },
          error: (err) => {
            console.error("Parsing error:", err);
            setIsLoading(false);
          }
        });
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setIsLoading(false);
      });
    } else {
      setData([]);
    }
  }, [activeSection]);


  const isInSelectedRange = (dStr) => {
    if (!dateRange.from || !dateRange.to) return true;
    const d = parseDate(dStr);
    if (!d) return false;
    const [fy, fm, fd] = dateRange.from.split('-');
    const from = new Date(parseInt(fy, 10), parseInt(fm, 10) - 1, parseInt(fd, 10), 0, 0, 0);
    const [ty, tm, td] = dateRange.to.split('-');
    const to = new Date(parseInt(ty, 10), parseInt(tm, 10) - 1, parseInt(td, 10), 23, 59, 59, 999);
    return d >= from && d <= to;
  };

  const isBeforeRange = (dStr) => {
    if (!dateRange.from || !dateRange.to) return false;
    const d = parseDate(dStr);
    if (!d) return false;
    const [fy, fm, fd] = dateRange.from.split('-');
    const from = new Date(parseInt(fy, 10), parseInt(fm, 10) - 1, parseInt(fd, 10), 0, 0, 0);
    return d < from;
  };

  const getSegmentColor = (cStatus, eStatus, eDate) => {
    if (eStatus?.toLowerCase() === 'completed') {
      if (dateRange.from && dateRange.to) {
        if (isInSelectedRange(eDate)) return 'bg-green-500 border-green-700'; // Completed in range
        if (isBeforeRange(eDate)) return 'bg-green-200 border-green-300 opacity-60'; // Before range
        return 'bg-white border-slate-300 text-slate-300'; // After range or pending
      }
      return 'bg-green-500 border-green-700'; // No range, show all
    }
    if (cStatus?.toLowerCase() === 'completed') return 'bg-blue-500 border-blue-700';   // Casting: Blue
    return 'bg-white border-slate-300 text-slate-300'; // Pending
  };

  // Returns Tailwind classes for foundation/pier/piercap based on drawing + completion status
  const getSubstructureColor = (status, drawingStatus, compDate) => {
    if (isDrawingUnavailable(drawingStatus)) return 'bg-red-500 border-red-600';
    if (status?.toLowerCase() === 'completed') {
      if (dateRange.from && dateRange.to) {
        if (isInSelectedRange(compDate)) return 'bg-green-500 border-green-600';
        if (isBeforeRange(compDate)) return 'bg-green-100 border-green-200 opacity-60';
        return 'bg-white border-slate-300';
      }
      return 'bg-green-500 border-green-600';
    }
    return 'bg-white border-slate-300';
  };

  const getSubstructureFillStroke = (status, drawingStatus, compDate) => {
    if (isDrawingUnavailable(drawingStatus)) return 'fill-red-500 stroke-red-600';
    if (status?.toLowerCase() === 'completed') {
      if (dateRange.from && dateRange.to) {
        if (isInSelectedRange(compDate)) return 'fill-green-500 stroke-green-600';
        if (isBeforeRange(compDate)) return 'fill-green-100 stroke-green-200 opacity-60';
        return 'fill-white stroke-slate-300';
      }
      return 'fill-green-500 stroke-green-600';
    }
    return 'fill-white stroke-slate-300';
  };

  // Pre-calculate indices for PM filtering
  let pmStartIdx = -1;
  let pmEndIdx = -1;
  let activePM = null;
  if (selectedPM) {
    const pmList = pmsBySection[activeSection] || [];
    activePM = pmList.find(p => p.id === selectedPM);
    if (activePM) {
      const sPier = activePM.startPier.trim().toUpperCase();
      const ePier = activePM.endPier.trim().toUpperCase();
      
      pmStartIdx = data.findIndex(r => (r['Pier ID'] || '').trim().toUpperCase() === sPier);
      // For endPier, find the LAST row matching that pier ID
      pmEndIdx = data.reduce((acc, r, i) => (r['Pier ID'] || '').trim().toUpperCase() === ePier ? i : acc, -1);
    }
  }

  const filteredData = data.filter((row, index) => {
    const matchesSearch = (row['Pier ID'] || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activePM) {
      if (pmStartIdx !== -1 && pmEndIdx !== -1) {
        if (index < pmStartIdx || index > pmEndIdx) return false;
      } else {
        // Fallback string-based parsing for safety
        const pierId = (row['Pier ID'] || '').trim().toUpperCase();
        if (!pierId) return false;
        
        const extractNum = (str) => {
          const match = str.match(/\d*P(\d+)/i);
          return match ? parseInt(match[1], 10) : parseInt(str.replace(/\D/g, ''), 10);
        };

        const pNum = extractNum(pierId);
        const sNum = extractNum(activePM.startPier);
        const eNum = extractNum(activePM.endPier);
        
        if (!isNaN(pNum) && !isNaN(sNum) && !isNaN(eNum)) {
          if (pNum < sNum || pNum > eNum) return false;
        }
      }
    }
    return true;
  });

  const getSummary = () => {
    const summary = {
      foundation: { planned: 0, achieved: 0, ftm: 0, prevDay: 0 },
      pier: { planned: 0, achieved: 0, ftm: 0, prevDay: 0 },
      pierCap: { planned: 0, achieved: 0, ftm: 0, prevDay: 0 },
      superstructure: {
        'SBS': { planned: 0, achieved: 0, ftm: 0, prevDay: 0 },
        'FSLM': { planned: 0, achieved: 0, ftm: 0, prevDay: 0 },
        'CEM': { planned: 0, achieved: 0, ftm: 0, prevDay: 0 },
        'GAD': { planned: 0, achieved: 0, ftm: 0, prevDay: 0 },
      }
    };

    const uniquePiers = new Set();

    filteredData.forEach(row => {
      const pierId = row['Pier ID'];
      const typeStr = row['Type'];
      const type = typeStr ? typeStr.toUpperCase().trim() : null;
      const segCount = parseInt(row['No of Segments'] || row['No of Segment'] || 0);

      // Superstructure segments are always additive per row (Span)
      if (type && summary.superstructure[type]) {
  summary.superstructure[type].planned += segCount;
  for (let i = 1; i <= segCount; i++) {
    const sNum = String(i).padStart(2, '00');
    const castingStatus = row[`S${sNum}_Casting_Status`];   // ← casting
    const castingDate   = row[`S${sNum}_Casting_Date`];     // ← casting

    if (castingStatus?.toLowerCase() === 'completed') {
      if (dateRange.from && dateRange.to) {
        if (isInSelectedRange(castingDate)) summary.superstructure[type].achieved += 1;
      } else {
        summary.superstructure[type].achieved += 1;
      }
    }
    if (isCurrentMonth(castingDate)) {
      summary.superstructure[type].ftm += 1;
    }
    if (isPreviousDay(castingDate)) {
      summary.superstructure[type].prevDay += 1;
    }
  }
}

      if (pierId && !uniquePiers.has(pierId)) {
        uniquePiers.add(pierId);

        summary.foundation.planned += 1;
        if (row.Foundation_Status?.toLowerCase() === 'completed') {
          if (dateRange.from && dateRange.to) {
            if (isInSelectedRange(row.Foundation_Completed_Date)) summary.foundation.achieved += 1;
          } else {
            summary.foundation.achieved += 1;
          }
        }
        if (isCurrentMonth(row.Foundation_Completed_Date)) summary.foundation.ftm += 1;
        if (isPreviousDay(row.Foundation_Completed_Date)) summary.foundation.prevDay += 1;

        summary.pier.planned += 1;
        if (row.Pier_Status?.toLowerCase() === 'completed') {
          if (dateRange.from && dateRange.to) {
            if (isInSelectedRange(row.Pier_Completed_Date)) summary.pier.achieved += 1;
          } else {
            summary.pier.achieved += 1;
          }
        }
        if (isCurrentMonth(row.Pier_Completed_Date)) summary.pier.ftm += 1;
        if (isPreviousDay(row.Pier_Completed_Date)) summary.pier.prevDay += 1;

        summary.pierCap.planned += 1;
        if (row.PierCap_Status?.toLowerCase() === 'completed') {
          if (dateRange.from && dateRange.to) {
            if (isInSelectedRange(row.PierCap_Completed_Date)) summary.pierCap.achieved += 1;
          } else {
            summary.pierCap.achieved += 1;
          }
        }
        if (isCurrentMonth(row.PierCap_Completed_Date)) summary.pierCap.ftm += 1;
        if (isPreviousDay(row.PierCap_Completed_Date)) summary.pierCap.prevDay += 1;
      }
    });

    return summary;
  };
  
  const handleGirderSelect = (spanId) => {
    const element = document.getElementById(`span-${spanId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.style.outline = "4px solid #f97316";
      element.style.outlineOffset = "8px";
      element.style.borderRadius = "8px";
      element.style.transition = "outline 0.3s ease";
      setTimeout(() => {
        element.style.outline = "none";
      }, 3000);
    }
  };


  const summary = getSummary();

  const handleExportPDF = async () => {
    const element = document.getElementById('pdf-content');
    if (!element) return;

    setIsExporting(true);
    setExportProgress("Preparing layout...");

    try {
      // Let UI update first (important)
      await new Promise((r) => setTimeout(r, 100));

      setExportProgress("Rendering image...");

      const dataUrl = await toPng(element, {
        quality: 0.95,
        pixelRatio: 12, // 🔥 BIG FIX (was 2 → huge lag)
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      setExportProgress("Generating PDF...");

      const pdf = new jsPDF('landscape', 'mm', 'a3');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(dataUrl);
      const renderWidth = pdfWidth;
      const renderHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = renderHeight;
      let position = 0;

      pdf.addImage(dataUrl, 'PNG', 0, position, renderWidth, renderHeight);
      heightLeft -= pdfHeight;

      let pageCount = 1;

      while (heightLeft > 0) {
        setExportProgress(`Adding page ${++pageCount}...`);

        position = heightLeft - renderHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, renderWidth, renderHeight);
        heightLeft -= pdfHeight;
      }

      setExportProgress("Finalizing PDF...");

      await new Promise((r) => setTimeout(r, 100));

      pdf.save(`bridge-status-${new Date().toISOString().slice(0, 10)}.pdf`);

    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Failed to generate PDF. See console.');
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // Determine modal header color based on type
  const getModalHeaderColor = () => {
    if (!selected) return 'bg-slate-700';
    if (selected.type === 'segment') {
      return selected.data[`S${selected.id}_Erection_Status`]?.toLowerCase() === 'completed'
        ? 'bg-green-500'
        : 'bg-blue-500';
    }
    // Foundation / Pier / PierCap
    const drawingKeyMap = { foundation: 'Foundation Drawing Status', pier: 'Pier Drawing Status', piercap: 'Pier Cap Drawing Status' };
    const statusKeyMap = { foundation: 'Foundation_Status', pier: 'Pier_Status', piercap: 'PierCap_Status' };
    const drawingSt = selected.data[drawingKeyMap[selected.type]];
    const completeSt = selected.data[statusKeyMap[selected.type]];
    if (isDrawingUnavailable(drawingSt)) return 'bg-red-500';
    return completeSt?.toLowerCase() === 'completed' ? 'bg-green-600' : 'bg-slate-500';
  };

  // Get display label for modal type
  const getModalTitle = () => {
    if (!selected) return '';
    if (selected.type === 'segment') return `Segment ${selected.id}`;
    if (selected.type === 'foundation') return 'Foundation';
    if (selected.type === 'pier') return 'Pier';
    if (selected.type === 'piercap') return 'Pier Cap';
    return '';
  };

  // Get icon for modal type
  const getModalIcon = () => {
    if (!selected) return null;
    if (selected.type === 'foundation') return <Anchor size={14} />;
    if (selected.type === 'pier') return <Building2 size={14} />;
    if (selected.type === 'piercap') return <Columns2 size={14} />;
    return null;
  };

  return (
    <div className="p-0 bg-slate-50 min-h-screen font-sans selection:bg-blue-100">

      {/* Schematic Header */}
      <div className="w-full bg-white text-[#004b88] sticky top-0 z-50 shadow-lg border-2 border-[#004b88] rounded-2xl mt-2">
  <div className="px-3 lg:px-6 py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    
    {/* Col 1: Logo & Version */}
    <div className="flex flex-row lg:flex-col items-center lg:items-start justify-between lg:justify-center shrink-0">
      <div className="h-10 lg:h-16 w-32 lg:w-40 relative">
        <img 
          src="/logo2.png" 
          alt="Company Logo" 
          className="h-full w-full object-contain mix-blend-multiply lg:absolute lg:-top-12 lg:right-4" 
        />
      </div>
      
      <div className="flex flex-col gap-1">
        <p className="text-[8px] font-bold tracking-widest uppercase">DASHBOARD v2.0</p>
        {lastUpdated && (
          <span className="text-[7px] font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-[#004b88]/40 flex items-center gap-1">
            <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
            <span className="hidden sm:inline">SYNCED:</span> {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>

    {/* Col 2: Controls Container */}
    <div className="flex-1 flex flex-col items-center gap-3">
      <h1 className="text-sm lg:text-lg font-black tracking-widest lg:tracking-[0.2em] uppercase text-center">
        MAHSR C3 PROGRESS SCHEMATIC
      </h1>
      
      {/* Responsive Wrap: Stacks on mobile, rows on desktop */}
      <div className="flex flex-wrap justify-center gap-2 lg:gap-3 w-full">
        
        {/* Section Select */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-[100px] max-w-[120px]">
          <label className="text-[6px] font-bold uppercase ml-1">Section</label>
          <select 
            value={activeSection} 
            onChange={(e) => setActiveSection(e.target.value)}
            className="bg-white border border-[#004b88] text-[10px] font-black rounded px-2 py-1 outline-none appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '10px' }}
          >
            <option value="S1">SECTION 1</option>
            <option value="S2">SECTION 2</option>
            <option value="S3">SECTION 3</option>
            <option value="S4">SECTION 4</option>
          </select>
        </div>

        {/* Girder Select */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-[120px] max-w-[140px]">
          <label className="text-[6px] font-bold uppercase ml-1">Navigate LG</label>
          <select 
            onChange={(e) => handleGirderSelect(e.target.value)}
            className="bg-white border border-[#004b88] text-[10px] font-black rounded px-2 py-1 outline-none appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23fb923c\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '10px' }}
          >
            <option value="">SELECT...</option>
            {data.filter(row => row['Girder_Location_Span_ID'] === row['Span ID']).map((row, i) => (
              <option key={i} value={row['Span ID']}>{row['Span ID']}</option>
            ))}
          </select>
        </div>

        {/* PM Select */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-[140px] max-w-[160px]">
          <label className="text-[6px] font-bold uppercase ml-1 flex items-center gap-1">
            PM {isPmLoading && <span className="text-green-400 animate-pulse">●</span>}
          </label>
          <select 
            value={selectedPM} 
            onChange={(e) => setSelectedPM(e.target.value)} 
            disabled={isPmLoading}
            className="bg-white border border-[#004b88] text-[10px] font-black rounded px-2 py-1 outline-none appearance-none disabled:opacity-50"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2322c55e\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '10px' }}
          >
            <option value="">ALL MANAGERS</option>
            {(pmsBySection[activeSection] || []).map((pm) => (
              <option key={pm.id} value={pm.id}>{pm.name}</option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className=' flex flex-col md:flex-row  gap-2'>
        <div className="flex flex-col gap-0.5 flex-1 min-w-[180px]">
          <label className="text-[6px] font-bold uppercase ml-1">Date Range</label>
          <div className="flex w-fit items-center gap-1 bg-blue-50 border border-[#004b88]/50 px-2 py-1 rounded h-[26px]">
            <Calendar size={10} className="shrink-0" />
            <input type="date" className="bg-transparent text-[8px] font-bold outline-none w-full" value={dateRange.from} onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))} />
            <span className="text-[8px]">→</span>
            <input type="date" className="bg-transparent text-[8px] font-bold outline-none w-full" value={dateRange.to} onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} />
          </div>
        </div>

        {/* Search */}
 {/* Search */}
<div className="flex flex-col gap-0.5 flex-1 min-w-[120px] max-w-[140px]">
  <label className="text-[6px] font-bold uppercase ml-1">Search Pier</label>
  <div className="relative">
    <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-70" size={10} />
    <input 
      type="text"
      value={searchTerm}
      placeholder="SEARCH..."
      className="bg-blue-50 border border-[#004b88]/50 pl-7 pr-2 py-1 rounded text-[8px] font-bold w-full  outline-none"
      onChange={(e) => setSearchTerm(e.target.value)} 
    />
  </div>
</div> </div>
        {/* Stats Toggle (Mobile Only) */}
        <button 
          onClick={() => setShowStats(!showStats)}
          className={`lg:hidden p-2 rounded border border-[#004b88] self-end h-[26px] ${showStats ? 'bg-[#004b88] text-white' : 'bg-white'}`}
        >
          <BarChart3 size={12} />
        </button>
      </div>
    </div>

    {/* Col 3: Summary Table */}
    <div className={`${showStats ? 'block' : 'hidden'} lg:block shrink-0 w-full lg:w-auto max-w-[300px] uppercase lg:max-w-none`}>
      <div className="overflow-hidden bg-white rounded-xl border border-[#004b88] shadow-sm">
        <table className="text-left text-[7px] border-collapse w-full lg:w-[260px]">
          <thead className="bg-[#004b88] text-white font-bold">
            <tr>
              <th className="px-1 py-1 border-r border-white/30">DESCRIPTION</th>
              <th className="px-1 py-1 border-r border-white/30 text-center">SCOPE</th>
              <th className="px-1 py-1 border-r border-white/30 text-center">ACHIEVED</th>
              <th className="px-1 py-1 border-r border-white/30 text-center">FTM</th>
              <th className="px-1 py-1 text-center">PREV DAY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#004b88]/20">
             <tr className="hover:bg-blue-50">
               <td className="px-1 py-1 font-medium border-r border-[#004b88]/20">Foundation</td>
               <td className="px-1 py-1 text-center border-r border-[#004b88]/20 font-bold">{summary.foundation.planned || ''}</td>
               <td className="px-1 py-1 text-center border-r border-[#004b88]/20 font-bold">{summary.foundation.achieved || ''}</td>
               <td className="px-1 py-1 text-center border-r border-[#004b88]/20 font-bold">{summary.foundation.ftm || ''}</td>
               <td className="px-1 py-1 text-center font-bold">{summary.foundation.prevDay || ''}</td>
             </tr>
             <tr className="hover:bg-blue-50 bg-blue-50/40">
               <td className="px-1 py-1 font-medium border-r border-[#004b88]/20">Pier</td>
               <td className="px-1 py-1 text-center border-r border-[#004b88]/20 font-bold">{summary.pier.planned || ''}</td>
               <td className="px-1 py-1 text-center border-r border-[#004b88]/20 font-bold">{summary.pier.achieved || ''}</td>
               <td className="px-1 py-1 text-center border-r border-[#004b88]/20 font-bold">{summary.pier.ftm || ''}</td>
               <td className="px-1 py-1 text-center font-bold">{summary.pier.prevDay || ''}</td>
             </tr>
             <tr className="hover:bg-blue-50">
               <td className="px-1 py-1 font-medium border-r border-[#004b88]/20">Pier Cap</td>
               <td className="px-1 py-1 text-center border-r border-[#004b88]/20 font-bold">{summary.pierCap.planned || ''}</td>
               <td className="px-1 py-1 text-center border-r border-[#004b88]/20 font-bold">{summary.pierCap.achieved || ''}</td>
               <td className="px-1 py-1 text-center border-r border-[#004b88]/20 font-bold">{summary.pierCap.ftm || ''}</td>
               <td className="px-1 py-1 text-center font-bold">{summary.pierCap.prevDay || ''}</td>
             </tr>
             <tr className="bg-[#004b88] text-white font-bold">
               <td colSpan="5" className="px-1 py-0.5 text-center uppercase text-[7px]">Superstructure</td>
             </tr>
             {Object.keys(summary.superstructure).map((type, i) => (
                <tr key={type} className={`text-[7px] ${i % 2 === 0 ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-1 py-1 border-r border-[#004b88]/20">{type}</td>
                  <td className="px-1 py-1 text-center border-r border-[#004b88]/20">{summary.superstructure[type].planned || ''}</td>
                  <td className="px-1 py-1 text-center border-r border-[#004b88]/20 font-bold">{summary.superstructure[type].achieved || ''}</td>
                  <td className="px-1 py-1 text-center border-r border-[#004b88]/20">{summary.superstructure[type].ftm || ''}</td>
                  <td className="px-1 py-1 text-center">{summary.superstructure[type].prevDay || ''}</td>
                </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
      {/* Floating Print / Export Button */}
      <button
        onClick={handleExportPDF}
        disabled={isExporting}
        title="Print PDF"
        className={`fixed bottom-8 right-8 z-50 p-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center text-white ${isExporting
          ? 'bg-slate-600 cursor-not-allowed'
          : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30'
          }`}
      >
        {isExporting ? (
          <div className="flex flex-col items-center">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-[10px] mt-1 whitespace-nowrap">
              {exportProgress}
            </span>
          </div>
        ) : (
          <Printer size={24} />
        )}
      </button>

      <div id="pdf-content" className="w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] pt-16 pb-12 px-4 md:px-12 mt-12">
        {isLoading ? (
          <div className="w-full flex flex-col items-center justify-center py-40">
            <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Section Data...</p>
          </div>
        ) : !SECTION_URLS[activeSection] ? (
          <div className="w-full flex flex-col items-center justify-center py-40 text-center px-6">
            <div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl max-w-md shadow-sm">
              <FileDown size={48} className="text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-black text-slate-800 mb-2 uppercase">Missing Data URL</h2>
              <p className="text-sm text-slate-600 mb-6">The CSV URL for <strong>Section {activeSection.slice(1)}</strong> has not been added to your <code>.env</code> file yet.</p>
              <div className="bg-white p-4 rounded-xl border border-amber-100 text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Instructions:</p>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal ml-4">
                  <li>Open your Google Sheet.</li>
                  <li>Go to <b>File &gt; Share &gt; Publish to web</b>.</li>
                  <li>Select the tab for this section and choose <b>CSV</b> format.</li>
                  <li>Add the URL to <code>VITE_SHEET_URL_{activeSection}</code> in your <code>.env</code> file.</li>
                </ol>
              </div>
            </div>
          </div>
        ) : (() => {
          // --- LG Prediction Logic ---
          const predictedSpanIds = new Set();
          filteredData.forEach((r, idx) => {
            const loc = r['Girder_Location_Span_ID'];
            if (loc && loc.trim() !== '' && loc === r['Span ID']) {
              const type = r['Type']?.toUpperCase().trim();
              if (type === 'SBS' || type === 'FSLM') {
                const direction = getNormalizedLgDirection(r);
                const spanOffset = type === 'SBS' ? 5 : 40;
                
                if (direction === 'right') {
                  const predIdx = idx + spanOffset;
                  if (predIdx < filteredData.length) predictedSpanIds.add(filteredData[predIdx]['Span ID']);
                } else if (direction === 'left') {
                  const predIdx = idx - spanOffset;
                  if (predIdx >= 0) predictedSpanIds.add(filteredData[predIdx]['Span ID']);
                }
              }
            }
          });
          // --- End LG Prediction ---
          return (
          <div className="max-w-7xl mx-auto flex flex-wrap gap-y-40 gap-x-0 justify-start items-end">
            {filteredData.map((row, idx) => {

            const girderLoc = row['Girder_Location_Span_ID'];
            const isGirderHere = girderLoc && girderLoc.trim() !== "" && girderLoc === row['Span ID'];
            const isPredictedLG = predictedSpanIds.has(row['Span ID']);
            const currentLgDirection = isGirderHere ? getNormalizedLgDirection(row) : null;
            const segCount = parseInt(row['No of Segments'] || row['No of Segment'] || 0);

            // Adjust width limit so it displays 3-4 spans horizontally
            const dynWidth = Math.max(280, segCount * 8 + 50);

            return (
              <div
                key={idx}
                id={`span-${row['Span ID']}`}
                className="flex h-40 relative border-t border-slate-100 items-start scroll-mt-40 transition-all duration-500"
                style={{
                  width: '25%',
                  minWidth: `${dynWidth}px`,
                  maxWidth: `${Math.max(350, dynWidth)}px`,
                  pageBreakInside: 'avoid'
                }}
              >
                {/* Segment Boxes - positioned above girder, anchored to pier unit */}
                <div className={`absolute left-6 right-0 bottom-[calc(100%+4px)] flex flex-nowrap justify-center gap-[1px] p-1 bg-slate-100/50 rounded-md border border-dashed border-slate-300 min-h-[40px] items-center z-10 shadow-sm`}>
                  {/* Arrow Above Segment Box */}
                  {isGirderHere && currentLgDirection && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center justify-center bg-white rounded-full p-[2px] shadow-sm border border-slate-200 z-50">
                      {currentLgDirection === 'left' ? <ArrowLeft size={16} strokeWidth={3} className="text-orange-500" /> : <ArrowRight size={16} strokeWidth={3} className="text-orange-500" />}
                    </div>
                  )}
                  {Array.from({ length: segCount }).map((_, i) => {
                    const sNum = String(i + 1).padStart(2, '00');
                    const cS = row[`S${sNum}_Casting_Status`];
                    const eS = row[`S${sNum}_Erection_Status`];
                    const sColor = getSegmentColor(cS, eS, row[`S${sNum}_Erection_Date`]);
                    
                    let isReadyForErection = false;
                    const typeStr = row['Type']?.toUpperCase().trim();
                    const cDate = parseDate(row[`S${sNum}_Casting_Date`]);
                    if (typeStr === 'SBS' || typeStr === 'FSLM') {
                      if (cS?.toLowerCase() === 'completed' && eS?.toLowerCase() !== 'completed') {
                        if (cDate) {
                          const diffDays = (new Date() - cDate) / (1000 * 60 * 60 * 24);
                          const requiredDays = typeStr === 'SBS' ? 14 : 10;
                          if (diffDays >= requiredDays) {
                            isReadyForErection = true;
                          }
                        }
                      }
                    }

                    return (
                      <div
                        key={i}
                        onClick={() => setSelected({ id: sNum, data: row, type: 'segment' })}
                        className={`relative flex-1 ${segCount === 1 ? 'h-9 border-2' : 'max-w-[10px] h-4 border-[0.5px]'} min-w-[3px] cursor-pointer transition-all rounded-sm ${segCount === 1 ? 'hover:scale-[1.01] hover:brightness-95' : 'hover:scale-150'} hover:z-30 ${sColor} ${segCount === 1 && sColor.includes('border-slate-300') ? 'border-slate-400' : ''}`}
                        title={`Segment ${sNum}\nCasting Date: ${row[`S${sNum}_Casting_Date`] || 'N/A'}\n${eS?.toLowerCase() === 'completed' ? 'Erection Completed' : 'Ready for Erection: ' + (isReadyForErection ? 'Yes' : 'No')}`}
                      >
                        {isReadyForErection && (
                          <div 
                            className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full border-[0.5px] border-yellow-600 z-40"
                            title="Ready for Erection"
                          ></div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 1. Pier Column Section (Fixed Left) */}
                <div className="w-6 flex flex-col items-center relative h-full z-20">
                  {/* Pier ID label - raised to -top-20 to clear segment container */}
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 whitespace-nowrap z-20">
                    <span className="text-[9px] font-black uppercase text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">{row['Pier ID']}</span>
                  </div>

                  {/* Substructure */}
                  <div className="flex flex-col items-center w-full">
                    {/* Pier Cap */}
                    <svg
                      width="44" height="14" viewBox="0 0 44 14"
                      className={`z-10 cursor-pointer hover:opacity-80 hover:scale-105 transition-colors ${getSubstructureFillStroke(row.PierCap_Status, row['Pier Cap Drawing Status'], row.PierCap_Completed_Date)}`}
                      title="Click to view Pier Cap details"
                      onClick={() => setSelected({ data: row, type: 'piercap' })}
                    >
                      <path d="M 1.5 1.5 L 42.5 1.5 L 42.5 4.5 L 29.5 12.5 L 14.5 12.5 L 1.5 4.5 Z" strokeWidth={1} strokeLinejoin="round" />
                    </svg>
                    {/* Pier */}
                    <div
                      className={`w-4 h-14 border-x transition-colors cursor-pointer hover:opacity-80 ${getSubstructureColor(row.Pier_Status, row['Pier Drawing Status'], row.Pier_Completed_Date)} relative`}
                      title="Click to view Pier details"
                      onClick={() => setSelected({ data: row, type: 'pier' })}
                    >
                      <div className="absolute inset-y-0 left-0 w-[1.5px] bg-black/5"></div>
                    </div>
                    {/* Foundation */}
                    <svg
                      width="50" height="18" viewBox="0 0 50 18"
                      className={`cursor-pointer hover:opacity-80 hover:scale-105 transition-colors ${getSubstructureFillStroke(row.Foundation_Status, row['Foundation Drawing Status'], row.Foundation_Completed_Date)}`}
                      title="Click to view Foundation details"
                      onClick={() => setSelected({ data: row, type: 'foundation' })}
                    >
                      <path d="M 17.5 1.5 L 32.5 1.5 L 48.5 8.5 L 48.5 16.5 L 1.5 16.5 L 1.5 8.5 Z" strokeWidth={1} strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* 2. Span Section */}
                <div className="flex-1 flex flex-col items-center relative h-full pt-1">
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest bg-white/80 px-1 rounded shadow-sm">{row['Span ID']}</span>
                  </div>

                  {/* Double-sided arrow with span length & type — always visible */}
                  <div className="absolute inset-x-0 flex flex-col items-center" style={{ bottom: '52px' }}>
                    {/* Labels: only shown when columns exist in sheet */}
                    {(row['Type'] || row['Span Length']) && (
                      <div className="flex flex-col items-center gap-0.5 mb-1">
                        {row['Type'] && (
                          <span className="text-[7px] font-black uppercase tracking-widest text-slate-500 bg-white/90 px-1.5 py-0.5 rounded shadow-sm border border-slate-200">
                            {row['Type']}
                          </span>
                        )}
                        {row['Span Length'] && (
                          <span className="text-[8px] font-black text-slate-600 bg-white/90 px-1.5 rounded">
                            {row['Span Length']} m
                          </span>
                        )}
                      </div>
                    )}
                    {/* Arrow — always rendered */}
                    <div className="relative w-full flex items-center">
                      {/* Left arrowhead */}
                      <svg width="8" height="10" viewBox="0 0 8 10" className="flex-shrink-0 text-slate-400">
                        <polygon points="8,0 0,5 8,10" fill="currentColor" />
                      </svg>
                      {/* Line */}
                      <div className="flex-1 h-[1.5px] bg-slate-400"></div>
                      {/* Right arrowhead */}
                      <svg width="8" height="10" viewBox="0 0 8 10" className="flex-shrink-0 text-slate-400">
                        <polygon points="0,0 8,5 0,10" fill="currentColor" />
                      </svg>
                    </div>
                  </div>

                  {/* Girder Line */}
                  <div className={`h-2.5 w-full relative ${isGirderHere ? 'bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.4)]' : isPredictedLG ? 'bg-purple-400/40 border-2 border-dashed border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.3)]' : 'bg-slate-300'} border-x border-white/30 z-10 mt-[-4px]`}>
                    {isGirderHere && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white font-black text-[7px] rounded-full shadow-lg z-30 whitespace-nowrap border border-orange-400">
                        <Anchor size={8} /> GIRDER
                      </div>
                    )}
                    {isPredictedLG && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 bg-purple-600 text-white font-black text-[7px] rounded-full shadow-lg z-30 whitespace-nowrap border border-purple-400 animate-pulse">
                        <Anchor size={8} /> LG IN 30 DAYS (prediction)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
          );
          })()
        }


        {/* Modal Popup */}
        {selected && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">

              {/* ── SEGMENT modal ── */}
              {selected.type === 'segment' && (
                <>
                  <div className={`p-8 text-white ${getModalHeaderColor()}`}>
                    <h3 className="text-3xl font-black">Segment {selected.id}</h3>
                    <p className="text-xs font-bold uppercase tracking-widest">{selected.data['Span ID']}</p>
                  </div>
                  <div className="p-8 space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-2 flex items-center gap-2"><Hammer size={12} /> Casting Status</p>
                      <div className="text-lg font-bold">{selected.data[`S${selected.id}_Casting_Status`]} ({selected.data[`S${selected.id}_Casting_Date`] || 'No Date'})</div>
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-2 flex items-center gap-2"><HardHat size={12} /> Erection Status</p>
                      <div className="text-lg font-bold">{selected.data[`S${selected.id}_Erection_Status`]} ({selected.data[`S${selected.id}_Erection_Date`] || 'No Date'})</div>
                    </div>
                    <button onClick={() => setSelected(null)} className="w-full py-4 bg-slate-100 text-black rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200">Close</button>
                  </div>
                </>
              )}

              {/* ── FOUNDATION / PIER / PIER CAP modal ── */}
              {(selected.type === 'foundation' || selected.type === 'pier' || selected.type === 'piercap') && (() => {
                const typeMap = {
                  foundation: { label: 'Foundation', statusKey: 'Foundation_Status', dateKey: 'Foundation_Completed_Date', drawingKey: 'Foundation Drawing Status' },
                  pier: { label: 'Pier', statusKey: 'Pier_Status', dateKey: 'Pier_Completed_Date', drawingKey: 'Pier Drawing Status' },
                  piercap: { label: 'Pier Cap', statusKey: 'PierCap_Status', dateKey: 'PierCap_Completed_Date', drawingKey: 'Pier Cap Drawing Status' },
                };
                const { label, statusKey, dateKey, drawingKey } = typeMap[selected.type];
                const status = selected.data[statusKey];
                const date = selected.data[dateKey];
                const drawingStatus = selected.data[drawingKey];
                const isCompleted = status?.toLowerCase() === 'completed';
                const noDrawing = isDrawingUnavailable(drawingStatus);
                const headerBg = noDrawing ? 'bg-red-500' : isCompleted ? 'bg-green-600' : 'bg-slate-500';
                return (
                  <>
                    <div className={`p-8 text-white ${headerBg}`}>
                      <h3 className="text-3xl font-black">{label}</h3>
                      <p className="text-xs font-bold uppercase tracking-widest">{selected.data['Pier ID']}</p>
                    </div>
                    <div className="p-8 space-y-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-2 flex items-center gap-2">
                          <CheckCircle2 size={12} /> Status
                        </p>
                        <div className={`text-lg font-bold ${isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                          {status || 'Pending'}
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-2 flex items-center gap-2">
                          <Calendar size={12} /> Completed Date
                        </p>
                        <div className="text-lg font-bold text-slate-700">
                          {date || 'Not Yet Completed'}
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-2 flex items-center gap-2">
                          <CheckCircle2 size={12} /> Drawing Status
                        </p>
                        <div className={`text-lg font-bold ${noDrawing ? 'text-red-500' : 'text-green-600'}`}>
                          {drawingStatus || '—'}
                        </div>
                      </div>
                      <button onClick={() => setSelected(null)} className="w-full py-4 bg-slate-100 text-black rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200">Close</button>
                    </div>
                  </>
                );
              })()}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}