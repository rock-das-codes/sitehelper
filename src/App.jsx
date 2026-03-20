import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Calendar, CheckCircle2, Search, Anchor, Hammer, HardHat, Building2, Columns2, FileDown, Loader2, Printer, Menu, X, BarChart3 } from 'lucide-react';

import { toCanvas, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import "./App.css"
const SECTION_URLS = {
  S1: import.meta.env.VITE_SHEET_URL_S1,
  S2: import.meta.env.VITE_SHEET_URL_S2,
  S3: import.meta.env.VITE_SHEET_URL_S3,
};


const parseDate = (dStr) => {
  if (!dStr) return null;
  let parts = dStr.trim().split(/[-/]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) { // DD-MM-YYYY
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else if (parts[0].length === 4) { // YYYY-MM-DD
      return new Date(dStr);
    }
  }
  const d = new Date(dStr);
  return isNaN(d) ? null : d;
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

export default function BridgeDashboard() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [activeSection, setActiveSection] = useState("S1");
  const [showStats, setShowStats] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {
    const url = SECTION_URLS[activeSection];
    if (url) {
      setIsLoading(true);
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setData(results.data);
          setIsLoading(false);
        },
        error: (err) => {
          console.error("Parsing error:", err);
          setIsLoading(false);
        }
      });
    } else {
      setData([]);
    }
  }, [activeSection]);


  const isInSelectedRange = (dStr) => {
    if (!dateRange.from || !dateRange.to) return true;
    const d = parseDate(dStr);
    if (!d) return false;
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    to.setHours(23, 59, 59, 999);
    return d >= from && d <= to;
  };

  const isBeforeRange = (dStr) => {
    if (!dateRange.from || !dateRange.to) return false;
    const d = parseDate(dStr);
    if (!d) return false;
    const from = new Date(dateRange.from);
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
    if (drawingStatus?.toLowerCase() === 'not available') return 'bg-red-500 border-red-600';
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

  const filteredData = data.filter(row => row['Pier ID']?.toLowerCase().includes(searchTerm.toLowerCase()));

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
          const erectionStatus = row[`S${sNum}_Erection_Status`];
          const erectionDate = row[`S${sNum}_Erection_Date`];

          if (erectionStatus?.toLowerCase() === 'completed') {
            if (dateRange.from && dateRange.to) {
              if (isInSelectedRange(erectionDate)) summary.superstructure[type].achieved += 1;
            } else {
              summary.superstructure[type].achieved += 1;
            }
          }
          if (isCurrentMonth(erectionDate)) {
            summary.superstructure[type].ftm += 1;
          }
          if (isPreviousDay(erectionDate)) {
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
    const drawingKeyMap = { foundation: 'Foundation_Drawing_Status', pier: 'Pier_Drawing_Status', piercap: 'PierCap_Drawing_Status' };
    const statusKeyMap = { foundation: 'Foundation_Status', pier: 'Pier_Status', piercap: 'PierCap_Status' };
    const drawingSt = selected.data[drawingKeyMap[selected.type]];
    const completeSt = selected.data[statusKeyMap[selected.type]];
    if (drawingSt?.toLowerCase() === 'not available') return 'bg-red-500';
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
      <div className="w-full bg-slate-900 text-white sticky top-0 z-50 shadow-2xl border-b border-slate-700">
        <div className="px-4 lg:px-6 py-3 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          
          {/* Top Bar: Title + Mobile Actions */}
          <div className="flex justify-between items-center w-full lg:w-auto">
            <div>
              <h1 className="text-[10px] lg:text-xs font-black tracking-[0.2em] uppercase text-white/90 whitespace-nowrap leading-none">Progress Schematic</h1>
              <p className="text-[8px] lg:text-[9px] font-bold text-blue-400 tracking-widest mt-1 whitespace-nowrap leading-none">DASHBOARD v2.0</p>
            </div>
            
            <div className="flex items-center gap-2 lg:hidden">
              <button 
                onClick={() => setShowStats(!showStats)}
                className={`p-2 rounded-lg transition-colors ${showStats ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                title="Toggle Stats"
              >
                <BarChart3 size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row lg:items-center gap-4 w-full lg:w-auto">
            {/* Selectors Group */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Section Selector */}
              <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                <label className="text-[7px] font-bold text-slate-500 uppercase tracking-wider ml-1">Data Section</label>
                <select
                  value={activeSection}
                  onChange={(e) => setActiveSection(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-[10px] font-black rounded px-2 py-1.5 outline-none hover:border-blue-500 transition-colors cursor-pointer appearance-none min-w-[100px] w-full"
                  style={{ paddingRight: '20px', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px' }}
                >
                  <option value="S1">SECTION 1</option>
                  <option value="S2">SECTION 2</option>
                  <option value="S3">SECTION 3</option>
                </select>
              </div>

              {/* Girder Selector */}
              <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                <label className="text-[7px] font-bold text-slate-500 uppercase tracking-wider ml-1">Navigate to LG</label>
                <select
                  onChange={(e) => handleGirderSelect(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-[10px] font-black rounded px-2 py-1.5 outline-none hover:border-orange-500 transition-colors cursor-pointer appearance-none min-w-[120px] w-full"
                  style={{ paddingRight: '20px', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23fb923c\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px' }}
                >
                  <option value="">SELECT GIRDER...</option>
                  {data.filter(row => row['Girder_Location_Span_ID'] === row['Span ID']).map((row, i) => (
                    <option key={i} value={row['Span ID']}>
                      {row['Span ID']} ({row['Pier ID']})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filters Group */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-2 py-1.5 rounded flex-grow sm:flex-grow-0">
                <Calendar size={12} className="text-slate-500" />
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    className="bg-transparent text-[8px] font-bold text-slate-300 outline-none w-[75px] appearance-none"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  />
                  <span className="text-[8px] text-slate-600">→</span>
                  <input
                    type="date"
                    className="bg-transparent text-[8px] font-bold text-slate-300 outline-none w-[75px] appearance-none"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  />
                </div>
                {(dateRange.from || dateRange.to) && (
                  <button
                    onClick={() => setDateRange({ from: "", to: "" })}
                    className="text-[8px] font-black text-blue-400 hover:text-white uppercase ml-1"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="relative group flex-grow sm:flex-grow-0 min-w-[150px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={12} />
                <input
                  type="text"
                  placeholder="SEARCH PIER..."
                  className="bg-slate-800/50 border border-slate-700 pl-8 pr-3 py-1.5 rounded text-[8px] font-bold tracking-widest focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none w-full transition-all"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Compact Summary Table - hidden on mobile unless showStats is true */}
          <div className={`${showStats ? 'block' : 'hidden lg:block'} overflow-hidden bg-slate-800 rounded border border-slate-700 shadow-inner flex-shrink-0 w-full lg:w-auto mt-2 lg:mt-0`}>
            <table className="text-left text-[7px] border-collapse text-slate-300 w-full lg:w-[220px]">

              <thead className="bg-[#e4b025] text-slate-900 font-bold tracking-wider capitalize">
                <tr>
                  <th className="px-1 py-0.5 border-r border-slate-700/50">Desc</th>
                  <th className="px-1 py-0.5 border-r border-slate-700/50 text-center">Plan</th>
                  <th className="px-1 py-0.5 border-r border-slate-700/50 text-center">Achv</th>
                  <th className="px-1 py-0.5 border-r border-slate-700/50 text-center">FTM</th>
                  <th className="px-1 py-0.5 text-center">Previous Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                <tr className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-1 py-[1px] font-medium border-r border-slate-700/50 lowercase">Foundation</td>
                  <td className="px-1 py-[1px] text-center border-r border-slate-700/50">{summary.foundation.planned || ''}</td>
                  <td className="px-1 py-[1px] text-center border-r border-slate-700/50 font-bold text-white">{summary.foundation.achieved || ''}</td>
                  <td className="px-1 py-[1px] text-center border-r border-slate-700/50">{summary.foundation.ftm || ''}</td>
                  <td className="px-1 py-[1px] text-center">{summary.foundation.prevDay || ''}</td>
                </tr>
                <tr className="hover:bg-slate-700/50 transition-colors bg-slate-800/30">
                  <td className="px-1 py-[1px] font-medium border-r border-slate-700/50 lowercase">Pier</td>
                  <td className="px-1 py-[1px] text-center border-r border-slate-700/50">{summary.pier.planned || ''}</td>
                  <td className="px-1 py-[1px] text-center border-r border-slate-700/50 font-bold text-white">{summary.pier.achieved || ''}</td>
                  <td className="px-1 py-[1px] text-center border-r border-slate-700/50">{summary.pier.ftm || ''}</td>
                  <td className="px-1 py-[1px] text-center">{summary.pier.prevDay || ''}</td>
                </tr>
                <tr className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-1 py-[1px] font-medium border-r border-slate-700/50 lowercase">Pier Cap</td>
                  <td className="px-1 py-[1px] text-center border-r border-slate-700/50">{summary.pierCap.planned || ''}</td>
                  <td className="px-1 py-[1px] text-center border-r border-slate-700/50 font-bold text-white">{summary.pierCap.achieved || ''}</td>
                  <td className="px-1 py-[1px] text-center border-r border-slate-700/50">{summary.pierCap.ftm || ''}</td>
                  <td className="px-1 py-[1px] text-center">{summary.pierCap.prevDay || ''}</td>
                </tr>
                <tr className="bg-slate-700 text-slate-100 font-bold">
                  <td colSpan="5" className="px-1 py-0.5 text-center uppercase tracking-widest text-[5px]">Superstructure</td>
                </tr>
                {Object.keys(summary.superstructure).map((type, i) => (
                  <tr key={type} className={`hover:bg-slate-700/50 transition-colors ${i % 2 === 0 ? 'bg-slate-800/30' : ''}`}>
                    <td className="px-1 py-[1px] font-medium border-r border-slate-700/50">{type}</td>
                    <td className="px-1 py-[1px] text-center border-r border-slate-700/50">{summary.superstructure[type].planned || ''}</td>
                    <td className="px-1 py-[1px] text-center border-r border-slate-700/50 font-bold text-white">{summary.superstructure[type].achieved || ''}</td>
                    <td className="px-1 py-[1px] text-center border-r border-slate-700/50">{summary.superstructure[type].ftm || ''}</td>
                    <td className="px-1 py-[1px] text-center">{summary.superstructure[type].prevDay || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        ) : (
          <div className="max-w-7xl mx-auto flex flex-wrap gap-y-40 gap-x-0 justify-start items-end">
            {filteredData.map((row, idx) => {

            const isGirderHere = row['Girder_Location_Span_ID'] === row['Span ID'];
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
                <div className="absolute left-6 right-0 bottom-[calc(100%+4px)] flex flex-nowrap justify-center gap-[1px] p-1 bg-slate-50/20 rounded border border-dashed border-slate-200 min-h-[36px] items-center z-10">
                  {Array.from({ length: segCount }).map((_, i) => {
                    const sNum = String(i + 1).padStart(2, '00');
                    const cS = row[`S${sNum}_Casting_Status`];
                    const eS = row[`S${sNum}_Erection_Status`];
                    return (
                      <div
                        key={i}
                        onClick={() => setSelected({ id: sNum, data: row, type: 'segment' })}
                        className={`flex-1 max-w-[10px] min-w-[3px] h-4 border-[0.5px] cursor-pointer transition-all rounded-[0.5px] hover:scale-150 hover:z-30 ${getSegmentColor(cS, eS, row[`S${sNum}_Erection_Date`])}`}
                        title={`Segment ${sNum}`}
                      ></div>
                    );
                  })}
                </div>

                {/* 1. Pier Column Section (Fixed Left) */}
                <div className="w-6 flex flex-col items-center relative h-full">
                  {/* Pier ID label - raised to -top-20 to clear segment container */}
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 whitespace-nowrap z-20">
                    <span className="text-[9px] font-black uppercase text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">{row['Pier ID']}</span>
                  </div>

                  {/* Substructure */}
                  <div className="flex flex-col items-center w-full">
                    {/* Pier Cap */}
                    <div
                      className={`w-[140%] h-2.5 border-x border-t rounded-t-[1px] transition-colors z-10 cursor-pointer hover:opacity-80 hover:scale-105 ${getSubstructureColor(row.PierCap_Status, row.PierCap_Drawing_Status, row.PierCap_Completed_Date)}`}
                      title="Click to view Pier Cap details"
                      onClick={() => setSelected({ data: row, type: 'piercap' })}
                    ></div>
                    {/* Pier */}
                    <div
                      className={`w-4 h-14 border-x transition-colors cursor-pointer hover:opacity-80 ${getSubstructureColor(row.Pier_Status, row.Pier_Drawing_Status, row.Pier_Completed_Date)} relative`}
                      title="Click to view Pier details"
                      onClick={() => setSelected({ data: row, type: 'pier' })}
                    >
                      <div className="absolute inset-y-0 left-0 w-[1.5px] bg-black/5"></div>
                    </div>
                    {/* Foundation */}
                    <div
                      className={`w-12 h-4 border rounded-b-[1px] transition-colors cursor-pointer hover:opacity-80 ${getSubstructureColor(row.Foundation_Status, row.Foundation_Drawing_Status, row.Foundation_Completed_Date)}`}
                      title="Click to view Foundation details"
                      onClick={() => setSelected({ data: row, type: 'foundation' })}
                    ></div>
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

                  {/* Girder Line - unchanged */}
                  <div className={`h-2.5 w-full relative ${isGirderHere ? 'bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.4)]' : 'bg-slate-300'} border-x border-white/30 z-10 mt-[-4px]`}>
                    {isGirderHere && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white font-black text-[7px] rounded-full shadow-lg z-30 whitespace-nowrap border border-orange-400">
                        <Anchor size={8} /> GIRDER
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}


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
                  foundation: { label: 'Foundation', statusKey: 'Foundation_Status', dateKey: 'Foundation_Completed_Date', drawingKey: 'Foundation_Drawing_Status' },
                  pier: { label: 'Pier', statusKey: 'Pier_Status', dateKey: 'Pier_Completed_Date', drawingKey: 'Pier_Drawing_Status' },
                  piercap: { label: 'Pier Cap', statusKey: 'PierCap_Status', dateKey: 'PierCap_Completed_Date', drawingKey: 'PierCap_Drawing_Status' },
                };
                const { label, statusKey, dateKey, drawingKey } = typeMap[selected.type];
                const status = selected.data[statusKey];
                const date = selected.data[dateKey];
                const drawingStatus = selected.data[drawingKey];
                const isCompleted = status?.toLowerCase() === 'completed';
                const noDrawing = drawingStatus?.toLowerCase() === 'not available';
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