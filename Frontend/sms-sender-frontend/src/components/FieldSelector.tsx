import React from "react";
import { FieldSelectorProps } from "../../interface";

export default function FieldSelector({ allFields, fieldLabels, selectedFields, onToggle }: FieldSelectorProps) {
  return (
    <div className="mb-4">
      <label className="font-medium">เลือก Field ที่ต้องการส่ง:</label>
      <div className="flex gap-4 flex-wrap mt-2">
        {allFields.map((field) => (
          <label key={field} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={selectedFields.has(field)}
              onChange={() => onToggle(field)}
            />
            {fieldLabels[field]}
          </label>
        ))}
      </div>
    </div>
  );
}