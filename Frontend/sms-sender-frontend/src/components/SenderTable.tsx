import React from "react";
import { SenderTableProps } from "../../interface";

export default function SenderTable({
  senders,
  allFields,
  fieldLabels,
  selectedRows,
  onToggleRow,
}: SenderTableProps) {
  return (
    <div className="mt-4">
      <div className="w-full rounded-lg overflow-hidden border border-gray-200">
        {/* หัวตาราง */}
        <div className="grid grid-cols-[60px_repeat(auto-fit,minmax(120px,1fr))] bg-gray-100 text-sm font-semibold text-gray-700 px-4 py-3">
          <div className="text-center">เลือก</div>
          {allFields.map((f) => (
            <div key={f}>{fieldLabels[f]}</div>
          ))}
        </div>

        {/* เนื้อหาตาราง */}
        {senders.map((sender, index) => (
          <div
            key={index}
            className="grid grid-cols-[60px_repeat(auto-fit,minmax(120px,1fr))] items-center px-4 py-3 border-t border-gray-100 bg-white hover:bg-gray-50 transition cursor-pointer"
            onClick={() => onToggleRow(index)}
          >
            <div className="text-center">
              <input
                type="checkbox"
                checked={selectedRows.has(index)}
                onChange={() => onToggleRow(index)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4"
              />
            </div>
            {allFields.map((f) => (
              <div key={f} className="text-sm text-gray-800 break-words">
                {sender[f]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}