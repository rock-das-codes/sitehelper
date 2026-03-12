import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Calendar, CheckCircle2, Search, Anchor, Hammer, HardHat, Building2, Columns2 } from 'lucide-react';
import "./App.css"
const SHEET_URL = import.meta.env.VITE_SHEET_URL;

export default function BridgeDashboard() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Papa.parse(SHEET_URL, { download: true, header: true, skipEmptyLines: true, complete: (results) => setData(results.data) });
  }, []);

  const getSegmentColor = (cStatus, eStatus) => {
    if (eStatus?.toLowerCase() === 'completed') return 'bg-green-500 border-green-700'; // Erection: Green
    if (cStatus?.toLowerCase() === 'completed') return 'bg-blue-500 border-blue-700';   // Casting: Blue
    return 'bg-white border-slate-300 text-slate-300'; // Pending
  };

  // Returns Tailwind classes for foundation/pier/piercap based on drawing + completion status
  const getSubstructureColor = (status, drawingStatus) => {
    if (drawingStatus?.toLowerCase() === 'not available') return 'bg-red-500 border-red-600';
    if (status?.toLowerCase() === 'completed') return 'bg-green-500 border-green-600';
    return 'bg-white border-slate-300';
  };

  const filteredData = data.filter(row => row['Pier ID']?.toLowerCase().includes(searchTerm.toLowerCase()));

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
    <div className="p-0 bg-white min-h-screen font-sans selection:bg-blue-100">
      {/* Schematic Header */}
      <div className="w-full bg-slate-900 text-white px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-2xl border-b border-slate-700">
        <div>
          <h1 className="text-sm font-black tracking-[0.3em] uppercase opacity-90">Progress Schematic</h1>
          <p className="text-[10px] font-bold text-blue-400 tracking-widest mt-0.5">VIADUCT DASHBOARD v2.0</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={14} />
            <input
              type="text"
              placeholder="JUMP TO PIER..."
              className="bg-slate-800 border border-slate-700 pl-10 pr-4 py-1.5 rounded text-[10px] font-bold tracking-widest focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none w-48 transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="h-4 w-[1px] bg-slate-700"></div>
          <div className="flex items-center gap-3 text-[9px] font-bold tracking-widest">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-sm"></div><span className="text-slate-300">ERECTED</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div><span className="text-slate-300">CAST</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm"></div><span className="text-slate-300">NO DRAWING</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-300 rounded-sm"></div><span className="text-slate-300">PENDING</span></div>
          </div>
        </div>
      </div>

      <div className="w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] pt-28 pb-12 px-4 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-y-40 gap-x-0 justify-start items-end">
          {filteredData.map((row, idx) => {
            const isGirderHere = row['Girder_Location_Span_ID'] === row['Span ID'];
            const segCount = parseInt(row['No of Segments'] || row['No of Segment'] || 0);
            // For >15 segments, expand pier width so bars are never hidden
            const dynWidth = segCount > 15 ? Math.max(160, segCount * 6 + 50) : null;
            return (
              <div
                key={idx}
                className="flex h-40 relative border-t border-slate-100 items-start"
                style={dynWidth
                  ? { width: `${dynWidth}px`, minWidth: `${dynWidth}px`, maxWidth: `${dynWidth}px` }
                  : { width: '12.5%', minWidth: '140px', maxWidth: '180px' }}
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
                        className={`flex-1 max-w-[10px] min-w-[3px] h-4 border-[0.5px] cursor-pointer transition-all rounded-[0.5px] hover:scale-150 hover:z-30 ${getSegmentColor(cS, eS)}`}
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
                      className={`w-[140%] h-2.5 border-x border-t rounded-t-[1px] transition-colors z-10 cursor-pointer hover:opacity-80 hover:scale-105 ${getSubstructureColor(row.PierCap_Status, row.PierCap_Drawing_Status)}`}
                      title="Click to view Pier Cap details"
                      onClick={() => setSelected({ data: row, type: 'piercap' })}
                    ></div>
                    {/* Pier */}
                    <div
                      className={`w-4 h-14 border-x transition-colors cursor-pointer hover:opacity-80 ${getSubstructureColor(row.Pier_Status, row.Pier_Drawing_Status)} relative`}
                      title="Click to view Pier details"
                      onClick={() => setSelected({ data: row, type: 'pier' })}
                    >
                      <div className="absolute inset-y-0 left-0 w-[1.5px] bg-black/5"></div>
                    </div>
                    {/* Foundation */}
                    <div
                      className={`w-12 h-4 border rounded-b-[1px] transition-colors cursor-pointer hover:opacity-80 ${getSubstructureColor(row.Foundation_Status, row.Foundation_Drawing_Status)}`}
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