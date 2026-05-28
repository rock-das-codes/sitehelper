import React from 'react';
import { ArrowRight } from 'lucide-react';

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed'];

export default function SegmentTable({ rows, onUpdate, canEdit = true }) {
  // Determine maximum segment count across all rows
  const maxSeg = rows.reduce((max, r) => {
    const cnt = parseInt(r['No of Segments'] || r['No of Segment'] || 0, 10);
    return cnt > max ? cnt : max;
  }, 0);

  const handleChange = (pierId, segNum, field, value) => {
    if (!canEdit) return; // Prevent changes if not editable
    const key = `S${String(segNum).padStart(2, '0')}_${field}`;
    onUpdate(pierId, key, value);
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
                      value={row[`S${segKey}_Casting_Date`]?.split('T')[0] || ''}
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
                      value={row[`S${segKey}_Erection_Date`]?.split('T')[0] || ''}
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
