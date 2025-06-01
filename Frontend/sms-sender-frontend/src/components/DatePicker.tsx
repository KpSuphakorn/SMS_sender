import React from "react";
import { DatepickerProps } from "../../interface";

export default function Datepicker({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
}: DatepickerProps) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && (!endDate || value <= endDate)) {
      setStartDate(value);
    } else {
      alert("วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด");
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && value <= today && (!startDate || value >= startDate)) {
      setEndDate(value);
    } else {
      alert("วันที่สิ้นสุดต้องอยู่ระหว่างวันที่เริ่มต้นและวันนี้");
    }
  };

  return (
    <div className="mb-4 flex gap-4">
      <div>
        <label className="font-medium">วันที่เริ่มต้น:</label>
        <input
          type="date"
          value={startDate || ""}
          max={endDate || today}
          onChange={handleStartDateChange}
          className="border px-2 py-1 ml-2"
        />
      </div>
      <div>
        <label className="font-medium">วันที่สิ้นสุด:</label>
        <input
          type="date"
          value={endDate || ""}
          min={startDate || ""}
          max={today}
          onChange={handleEndDateChange}
          className="border px-2 py-1 ml-2"
        />
      </div>
    </div>
  );
}
