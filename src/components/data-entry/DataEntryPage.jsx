import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ArrowLeft, ArrowRight, Save, X, Search, Loader2, FileDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SignOutButton, useOrganization, useUser } from '@clerk/react';
import StatusCard from './StatusCard';
import SegmentTable from './SegmentTable';

const formatValueForCsv = (key, val) => {
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const day = String(val.getUTCDate()).padStart(2, '0');
    const month = String(val.getUTCMonth() + 1).padStart(2, '0');
    const year = val.getUTCFullYear();
    return `${year}-${month}-${day}`;
  }
  
  if (val && typeof val === 'string' && key.toLowerCase().includes('date')) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return val;
    }
    
    // Convert DD-MM-YYYY to YYYY-MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
      const parts = val.split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    
    // Parse long date string (e.g. "Fri May 02 2025 23:59:50 GMT+0530")
    const parts = val.trim().split(/\s+/);
    if (parts.length >= 4 && isNaN(Number(parts[0])) && isNaN(Number(parts[1]))) {
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const mIdx = monthNames.findIndex(m => parts[1].toLowerCase().startsWith(m));
      const day = parseInt(parts[2], 10);
      const year = parseInt(parts[3], 10);
      if (mIdx !== -1 && !isNaN(day) && !isNaN(year)) {
        return `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  const sVal = val === null || val === undefined ? '' : String(val);
  if (sVal.includes(',') || sVal.includes('"')) {
    return `"${sVal.replace(/"/g, '""')}"`;
  }
  return sVal;
};

// Helper to convert rows back to CSV string
const rowsToCsv = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const csvLines = rows.map((row) =>
    headers.map((h) => formatValueForCsv(h, row[h])).join(',')
  );
  return [headers.join(','), ...csvLines].join('\n');
};

export default function DataEntryPage({ onClose }) {
  const [section, setSection] = useState('S1');
  const [rawData, setRawData] = useState([]);
  const [editedData, setEditedData] = useState([]);
  const [selectedPier, setSelectedPier] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useUser();
  const { organization } = useOrganization();

  // Get current user's role in the organization
  const userOrgRole = user?.organizationMemberships?.find(
    (m) => m.organization?.id === organization?.id
  )?.role;
  
  const isMember = userOrgRole === 'org:member';
  const canEdit = !isMember;

  // Load data (same as dashboard)
  useEffect(() => {
    const urlMap = {
      S1: import.meta.env.VITE_SHEET_URL_S1,
      S2: import.meta.env.VITE_SHEET_URL_S2,
      S3: import.meta.env.VITE_SHEET_URL_S3,
      S4: import.meta.env.VITE_SHEET_URL_S4,
    };
    const url = urlMap[section];
    if (!url) return;
    const cacheBuster = `&t=${new Date().getTime()}`;
    // Convert OneDrive sharing / embed link to direct download link
    const getDirectUrl = (u) => {
      let finalUrl = u.trim();
      if (finalUrl.includes('onedrive.live.com/embed')) {
        finalUrl = finalUrl.replace('/embed', '/download');
      }
      return finalUrl;
    };
    const finalUrl = getDirectUrl(url).includes('?') ? `${getDirectUrl(url)}${cacheBuster}` : `${getDirectUrl(url)}?${cacheBuster}`;

    const hasLongDates = (rows) => {
      return rows.some(row => 
        Object.keys(row).some(key => {
          if (!key.toLowerCase().includes('date')) return false;
          const val = row[key];
          if (!val || typeof val !== 'string') return false;
          const parts = val.trim().split(/\s+/);
          return parts.length >= 4 && isNaN(Number(parts[0])) && isNaN(Number(parts[1]));
        })
      );
    };

    fetch(finalUrl, {
      cache: 'no-store',
      headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
    })
      .then((r) => r.arrayBuffer())
      .then((buffer) => {
        const arr = new Uint8Array(buffer);
        const isExcel = arr[0] === 0x50 && arr[1] === 0x4B;

        if (isExcel) {
          try {
            const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
            let sheetName = wb.SheetNames.find(name => name.trim().toUpperCase() === section.trim().toUpperCase());
            if (!sheetName) {
              sheetName = wb.SheetNames.find(name => name.trim().toUpperCase().includes(section.trim().toUpperCase()));
            }
            if (!sheetName) {
              sheetName = wb.SheetNames[0];
            }
            const ws = wb.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
            setRawData(jsonData);
            setEditedData(jsonData.map((r) => ({ ...r })));
            if (hasLongDates(jsonData)) {
              setIsDirty(true);
            }
          } catch (err) {
            console.error("Excel parse error:", err);
          }
        } else {
          try {
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(buffer);
            Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              complete: (res) => {
                setRawData(res.data);
                setEditedData(res.data.map((r) => ({ ...r })));
                if (hasLongDates(res.data)) {
                  setIsDirty(true);
                }
              },
            });
          } catch (err) {
            console.error("CSV parse error:", err);
          }
        }
      })
      .catch(console.error);
  }, [section]);

  // Update a field in editedData
  const updateField = (pierId, field, value) => {
    setEditedData((prev) =>
      prev.map((row) => (row['Pier ID'] === pierId ? { ...row, [field]: value } : row))
    );
    setIsDirty(true);
  };

  // Save: convert to CSV and POST back to the sheet endpoint (placeholder)
  const handleSave = async () => {
    setIsSaving(true);
    const csv = rowsToCsv(editedData);
    const writeUrl = import.meta.env[`VITE_SHEET_WRITE_URL_${section}`]; // user must provide this env var
    if (!writeUrl) {
      alert('Write URL not configured. Please set VITE_SHEET_WRITE_URL_<SECTION> in .env');
      setIsSaving(false);
      return;
    }
    try {
      const finalUrl = `${writeUrl}?section=${section}`;
      await fetch(finalUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: csv,
      });
      alert('Data saved successfully!');
      setIsDirty(false);
    } catch (e) {
      console.error(e);
      alert('Failed to save data. Check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(editedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, section);
      XLSX.writeFile(wb, `Section_${section}_Edited.xlsx`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate Excel file');
    }
  };

  // Get unique pier IDs for selector
  const pierOptions = Array.from(new Set(editedData.map((r) => r['Pier ID']).filter(Boolean)));

  // Filter rows for selected pier (empty if none selected to reduce load)
  const visibleRows = selectedPier
    ? editedData.filter((r) => (r['Pier ID'] || '').trim().toUpperCase() === selectedPier.trim().toUpperCase())
    : [];

  // Completed preview (rows where all statuses are Completed)
  const completedRows = visibleRows.filter((row) => {
    const allSegmentCompleted = (() => {
      const segCount = parseInt(row['No of Segments'] || row['No of Segment'] || 0, 10);
      for (let i = 1; i <= segCount; i++) {
        const s = i.toString().padStart(2, '0');
        if ((row[`S${s}_Casting_Status`] || '').toLowerCase() !== 'completed') return false;
        if ((row[`S${s}_Erection_Status`] || '').toLowerCase() !== 'completed') return false;
      }
      return true;
    })();
    const foundationDone = (row.Foundation_Status || '').toLowerCase() === 'completed';
    const pierDone = (row.Pier_Status || '').toLowerCase() === 'completed';
    const pierCapDone = (row.PierCap_Status || '').toLowerCase() === 'completed';
    return foundationDone && pierDone && pierCapDone && allSegmentCompleted;
  });

  return (
    <div className="p-4 min-h-screen bg-slate-50 font-sans">
      {/* Access Control Alert */}
      {isMember && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-sm font-bold text-red-800">🔒 Read-Only Access</h3>
          <p className="text-sm text-red-700 mt-1">Members cannot edit data. Please contact an admin or editor to make changes.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link to="/" className="flex items-center gap-2 text-sm text-[#004b88] hover:underline">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <h2 className="text-xl font-black text-[#004b88]">Data Entry – Section {section}</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownloadExcel} 
            disabled={editedData.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#22c55e] text-white hover:bg-green-700 shadow-md hover:-translate-y-0.5 transition-all disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            <FileDown size={16} />
            Download Excel
          </button>
          <button 
            onClick={handleSave} 
            disabled={!isDirty || !canEdit || isSaving} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${(isDirty && canEdit) ? 'bg-[#004b88] text-white hover:bg-blue-800 shadow-md hover:-translate-y-0.5' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} ${isSaving ? 'opacity-70 !cursor-wait hover:translate-y-0' : ''}`}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {/* Section picker */}
      <div className="flex gap-4 mb-4 items-center">
        <label className="text-xs font-bold uppercase">Section</label>
        <select value={section} onChange={(e) => setSection(e.target.value)} className="rounded border px-2 py-1 text-sm">
          <option value="S1">S1</option>
          <option value="S2">S2</option>
          <option value="S3">S3</option>
          <option value="S4">S4</option>
        </select>
        <label className="text-xs font-bold uppercase ml-4">Pier</label>
        <div className="relative">
          <input
            type="text"
            list="pier-options"
            value={selectedPier}
            onChange={(e) => setSelectedPier(e.target.value)}
            placeholder="Search Pier..."
            className="rounded border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[#004b88] w-48 bg-white"
          />
          <datalist id="pier-options">
            {pierOptions.map((pid) => (
              <option key={pid} value={pid} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Content area */}
      {selectedPier ? (
        <>
          {/* Status cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatusCard
              title="Foundation"
              statusField="Foundation_Status"
              dateField="Foundation_Completed_Date"
              rows={visibleRows}
              onUpdate={updateField}
              selectedPier={selectedPier}
              canEdit={canEdit}
            />
            <StatusCard
              title="Pier"
              statusField="Pier_Status"
              dateField="Pier_Completed_Date"
              rows={visibleRows}
              onUpdate={updateField}
              selectedPier={selectedPier}
              canEdit={canEdit}
            />
            <StatusCard
              title="Pier Cap"
              statusField="PierCap_Status"
              dateField="PierCap_Completed_Date"
              rows={visibleRows}
              onUpdate={updateField}
              selectedPier={selectedPier}
              canEdit={canEdit}
            />
          </div>

          {/* Segment table */}
          <SegmentTable rows={visibleRows} onUpdate={updateField} canEdit={canEdit} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
          <Search size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">Please search and select a Pier ID to view data.</p>
        </div>
      )}

      {/* Completed preview */}
      {completedRows.length > 0 && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-bold text-green-800 mb-2">Completed Structures (read‑only)</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
            {completedRows.map((row, idx) => (
              <li key={idx}>
                Pier {row['Pier ID']} – {row['Type'] || 'Superstructure'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
