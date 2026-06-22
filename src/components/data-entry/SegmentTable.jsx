import React from 'react';
import { ArrowRight } from 'lucide-react';

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

const formatDateForSave = (dStr) => {
  if (!dStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
    const parts = dStr.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
  }
  return dStr;
};

export default function SegmentTable({ rows, onUpdate, canEdit = true }) {
  // Determine maximum segment count across all rows
  const maxSeg = rows.reduce((max, r) => {
    const cnt = parseInt(r['No of Segments'] || r['No of Segment'] || 0, 10);
    return cnt > max ? cnt : max;
  }, 0);

  const handleChange = (pierId, segNum, field, value) => {
    if (!canEdit) return; // Prevent changes if not editable
    
    let finalValue = value;
    if (field.includes('Date') && finalValue) {
      finalValue = formatDateForSave(finalValue);
    }
    
    const key = `S${String(segNum).padStart(2, '0')}_${field}`;
    onUpdate(pierId, key, finalValue);

    // If status changed and it's not completed, clear the date
    if ((field === 'Casting_Status' || field === 'Erection_Status') && value.toLowerCase() !== 'completed') {
      const dateKey = `S${String(segNum).padStart(2, '0')}_${field.replace('Status', 'Date')}`;
      onUpdate(pierId, dateKey, '');
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[#004b88]/20 shadow-sm">
      <table className="min-w-full bg-white">
        <thead className="bg-[#004b88] text-white">
          <tr>
            <th className="px-3 py-2 text-xs font-semibold">Pier ID</th>
            <th className="px-3 py-2 text-xs font-semibold">Segment</th>
            <th className="px-3 py-2 text-xs font-semibold">Casting Status</th>
            <th className="px-3 py-2 text-xs font-semibold">Casting Date</th>
            <th className="px-3 py-2 text-xs font-semibold">Erection Status</th>
            <th className="px-3 py-2 text-xs font-semibold">Erection Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const pierId = row['Pier ID'];
            const segCount = parseInt(row['No of Segments'] || row['No of Segment'] || 0, 10);
            const rowsForPier = [];
            for (let i = 1; i <= segCount; i++) {
              const segKey = String(i).padStart(2, '0');
              rowsForPier.push(
                <tr key={`${pierId}-S${segKey}`} className="border-b">
                  <td className="px-3 py-2 text-sm">{pierId}</td>
                  <td className="px-3 py-2 text-sm">S{segKey}</td>
                  <td className="px-3 py-2">
                    <select
                      value={row[`S${segKey}_Casting_Status`] || ''}
                      onChange={(e) => handleChange(pierId, i, 'Casting_Status', e.target.value)}
                      disabled={!canEdit}
                      className="rounded border px-1 py-0.5 text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={formatDateForInput(row[`S${segKey}_Casting_Date`])}
                      onChange={(e) => handleChange(pierId, i, 'Casting_Date', e.target.value)}
                      disabled={!canEdit || row[`S${segKey}_Casting_Status`]?.toLowerCase() !== 'completed'}
                      className="rounded border px-1 py-0.5 text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row[`S${segKey}_Erection_Status`] || ''}
                      onChange={(e) => handleChange(pierId, i, 'Erection_Status', e.target.value)}
                      disabled={!canEdit}
                      className="rounded border px-1 py-0.5 text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={formatDateForInput(row[`S${segKey}_Erection_Date`])}
                      onChange={(e) => handleChange(pierId, i, 'Erection_Date', e.target.value)}
                      disabled={!canEdit || row[`S${segKey}_Erection_Status`]?.toLowerCase() !== 'completed'}
                      className="rounded border px-1 py-0.5 text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </td>
                </tr>
              );
            }
            return rowsForPier;
          })}
        </tbody>
      </table>
    </div>
  );
}
