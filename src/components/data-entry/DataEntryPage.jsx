import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { ArrowLeft, ArrowRight, Save, X } from 'lucide-react';
import { SignOutButton, useOrganization, useUser } from '@clerk/react';
import StatusCard from './StatusCard';
import SegmentTable from './SegmentTable';

// Helper to convert rows back to CSV string
const rowsToCsv = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const csvLines = rows.map((row) =>
    headers.map((h) => {
      const val = row[h];
      // Escape commas and quotes
      if (typeof val === 'string' && (val.includes(',') || val.includes('"')))
        return `"${val.replace(/"/g, '""')}"`;
      return val ?? '';
    }).join(',')
  );
  return [headers.join(','), ...csvLines].join('\n');
};

export default function DataEntryPage({ onClose }) {
  const [section, setSection] = useState('S1');
  const [rawData, setRawData] = useState([]);
  const [editedData, setEditedData] = useState([]);
  const [selectedPier, setSelectedPier] = useState('');
  const [isDirty, setIsDirty] = useState(false);
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
    const finalUrl = url.includes('?') ? `${url}${cacheBuster}` : `${url}?${cacheBuster}`;
    fetch(finalUrl, {
      cache: 'no-store',
      headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
    })
      .then((r) => r.text())
      .then((txt) => {
        Papa.parse(txt, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => {
            setRawData(res.data);
            setEditedData(res.data.map((r) => ({ ...r })));
          },
        });
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
    const csv = rowsToCsv(editedData);
    const writeUrl = import.meta.env[`VITE_SHEET_WRITE_URL_${section}`]; // user must provide this env var
    if (!writeUrl) {
      alert('Write URL not configured. Please set VITE_SHEET_WRITE_URL_<SECTION> in .env');
      return;
    }
    try {
      await fetch(writeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });
      alert('Data saved successfully!');
      setIsDirty(false);
    } catch (e) {
      console.error(e);
      alert('Failed to save data. Check console for details.');
    }
  };

  // Get unique pier IDs for selector
  const pierOptions = Array.from(new Set(editedData.map((r) => r['Pier ID']).filter(Boolean)));

  // Filter rows for selected pier (or all if none selected)
  const visibleRows = selectedPier
    ? editedData.filter((r) => (r['Pier ID'] || '').trim().toUpperCase() === selectedPier.trim().toUpperCase())
    : editedData;

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
        <button onClick={onClose} className="flex items-center gap-2 text-sm text-[#004b88] hover:underline">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <h2 className="text-xl font-black text-[#004b88]">Data Entry – Section {section}</h2>
        <button onClick={handleSave} disabled={!isDirty || !canEdit} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${isDirty && canEdit ? 'bg-[#004b88] text-white hover:bg-blue-800' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}>
          <Save size={16} /> Save All
        </button>
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
        <select value={selectedPier} onChange={(e) => setSelectedPier(e.target.value)} className="rounded border px-2 py-1 text-sm">
          <option value="">All Piers</option>
          {pierOptions.map((pid) => (
            <option key={pid} value={pid}>
              {pid}
            </option>
          ))}
        </select>
      </div>

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
