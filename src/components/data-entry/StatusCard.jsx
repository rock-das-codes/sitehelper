import React from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';

// Simple status dropdown options
const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed'];

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
    });
  };

  const handleDateChange = (e) => {
    if (!isEditable) return;
    const newDate = e.target.value;
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
            value={currentDate?.split('T')[0] || ''}
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
