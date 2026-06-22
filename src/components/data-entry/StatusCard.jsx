import React from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';

// Simple status dropdown options
const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed'];

const formatDateForInput = (dStr) => {
  if (!dStr) return '';
  if (dStr instanceof Date) {
    if (isNaN(dStr.getTime())) return '';
    return `${dStr.getUTCFullYear()}-${String(dStr.getUTCMonth() + 1).padStart(2, '0')}-${String(dStr.getUTCDate()).padStart(2, '0')}`;
  }
  const s = String(dStr).trim();
  
  // Try parsing long date string (e.g. "Fri May 02 2025 23:59:50 GMT+0530")
  const partsLong = s.split(/\s+/);
  if (partsLong.length >= 4 && isNaN(Number(partsLong[0])) && isNaN(Number(partsLong[1]))) {
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const mIdx = monthNames.findIndex(m => partsLong[1].toLowerCase().startsWith(m));
    const day = parseInt(partsLong[2], 10);
    const year = parseInt(partsLong[3], 10);
    if (mIdx !== -1 && !isNaN(day) && !isNaN(year)) {
      return `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.substring(0, 10);
  
  const parts = s.split(/[-/.]/);
  if (parts.length === 3) {
    let p0 = parseInt(parts[0], 10);
    let p2 = parts[2];
    
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthIndex = monthNames.findIndex(m => parts[1].toLowerCase().startsWith(m));
    
    if (monthIndex !== -1 && !isNaN(p0)) {
      let year = p2.length === 4 ? parseInt(p2, 10) : 2000 + parseInt(p2, 10);
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
    }
    
    let p1 = parseInt(parts[1], 10);
    if (!isNaN(p0) && !isNaN(p1)) {
      if (p2.length === 4 || (p2.length === 2 && !isNaN(parseInt(p2, 10)))) {
        let year = p2.length === 4 ? p2 : 2000 + parseInt(p2, 10);
        let day = p0;
        let month = p1;
        if (p0 > 12) {
          day = p0; month = p1;
        } else if (p1 > 12) {
          day = p1; month = p0;
        } else {
          day = p0; month = p1;
        }
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    } else if (parts[0].length === 4) {
       return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
    }
  }

  if (/^\d+$/.test(s)) {
    const serial = parseInt(s, 10);
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + serial);
    return `${epoch.getUTCFullYear()}-${String(epoch.getUTCMonth() + 1).padStart(2, '0')}-${String(epoch.getUTCDate()).padStart(2, '0')}`;
  }

  const d = new Date(s);
  if (!isNaN(d)) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  
  return s.split('T')[0];
};

export default function StatusCard({ title, statusField, dateField, rows, onUpdate, selectedPier, canEdit = true }) {
  // Only editable when a specific pier is selected AND user has edit permission
  const isEditable = selectedPier && rows.length > 0 && canEdit;
  
  // Get status/date from first row
  const currentStatus = rows[0]?.[statusField] || '';
  const currentDate = rows[0]?.[dateField] || '';
  
  // Count status distribution when all piers are visible
  const getStatusCounts = () => {
    const counts = { 'Not Started': 0, 'In Progress': 0, 'Completed': 0 };
    rows.forEach((row) => {
      const status = row[statusField] || 'Not Started';
      if (counts.hasOwnProperty(status)) counts[status]++;
    });
    return counts;
  };
  
  const statusCounts = !selectedPier ? getStatusCounts() : null;

  const handleStatusChange = (e) => {
    if (!isEditable) return;
    const newStatus = e.target.value;
    rows.forEach((row) => {
      onUpdate(row['Pier ID'], statusField, newStatus);
      if (newStatus.toLowerCase() !== 'completed') {
        onUpdate(row['Pier ID'], dateField, '');
      }
    });
  };

  const handleDateChange = (e) => {
    if (!isEditable) return;
    let newDate = e.target.value;
    if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      const parts = newDate.split('-');
      newDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert to DD-MM-YYYY
    }
    rows.forEach((row) => {
      onUpdate(row['Pier ID'], dateField, newDate);
    });
  };

  return (
    <div className={`p-4 bg-white rounded-lg shadow-sm border ${isEditable ? 'border-[#004b88]/20' : 'border-gray-200'}`}>
      <h3 className="text-sm font-bold text-[#004b88] mb-2">{title}</h3>
      {isEditable ? (
        <div className="flex flex-col gap-2">
          <select
            value={currentStatus}
            onChange={handleStatusChange}
            className="rounded border px-2 py-1 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={formatDateForInput(currentDate)}
            onChange={handleDateChange}
            disabled={currentStatus.toLowerCase() !== 'completed'}
            className="rounded border px-2 py-1 text-sm"
          />
        </div>
      ) : statusCounts ? (
        <div className="text-xs text-gray-600 space-y-1">
          <p>📊 Status Distribution:</p>
          {STATUS_OPTIONS.map((status) => (
            <div key={status} className="flex justify-between">
              <span>{status}:</span>
              <span className="font-bold">{statusCounts[status] || 0}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">Select a Pier to edit</p>
      )}
    </div>
  );
}
