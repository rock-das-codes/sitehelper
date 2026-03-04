import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Calendar, CheckCircle2, Search, Anchor, Hammer, HardHat } from 'lucide-react';
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
    if (eStatus?.toLowerCase() === 'completed') return 'bg-blue-500 border-blue-700'; // Erection: Blue
    if (cStatus?.toLowerCase() === 'completed') return 'bg-green-500 border-green-700'; // Casting: Green
    return 'bg-white border-slate-300 text-slate-300'; // Pending: Red
  };

  const filteredData = data.filter(row => row['Pier ID']?.toLowerCase().includes(searchTerm.toLowerCase()));

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
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
            <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
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
                    const sNum = String(i + 1).padStart(2, '0');
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
                    <div className={`w-[140%] h-2.5 border-x border-t rounded-t-[1px] transition-colors z-10 ${row.PierCap_Status?.toLowerCase() === 'completed' ? 'bg-green-500 border-green-600' : 'bg-white border-slate-300'}`}></div>
                    <div className={`w-4 h-14 border-x transition-colors ${row.Pier_Status?.toLowerCase() === 'completed' ? 'bg-green-500 border-green-600' : 'bg-white border-slate-300'} relative`}>
                      <div className="absolute inset-y-0 left-0 w-[1.5px] bg-black/5"></div>
                    </div>
                    <div className={`w-12 h-4 border rounded-b-[1px] transition-colors ${row.Foundation_Status?.toLowerCase() === 'completed' ? 'bg-green-500 border-green-600' : 'bg-white border-slate-300 shadow-inner'}`}></div>
                  </div>
                </div>

                {/* 2. Span Section */}
                <div className="flex-1 flex flex-col items-center relative h-full pt-1">
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest bg-white/80 px-1 rounded shadow-sm">{row['Span ID']}</span>
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
              <div className={`p-8 text-white ${selected.data[`S${selected.id}_Erection_Status`]?.toLowerCase() === 'completed' ? 'bg-blue-500' : 'bg-green-500'}`}>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}