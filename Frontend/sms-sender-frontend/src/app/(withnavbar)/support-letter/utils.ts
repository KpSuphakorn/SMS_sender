import { DatesRangeValue } from '@mantine/dates';
import { Status } from './types';

// Utility functions
export const getProgressPercentage = (statuses: Status[]): number => {
  const completed = statuses.filter(s => s.done).length;
  return (completed / statuses.length) * 100;
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    year: '2-digit',
    month: '2-digit', 
    day: '2-digit'
  });
};

// Helper function to format date range display
export const formatDateRange = (dateRange: DatesRangeValue): string => {
  const [start, end] = dateRange;
  
  const format = (d: any): string => {
    if (!d) return "";
    
    // Handle different date formats
    let date: Date;
    if (d instanceof Date) {
      date = d;
    } else if (typeof d === 'string') {
      date = new Date(d);
    } else if (d && typeof d === 'object' && d.$date) {
      date = new Date(d.$date);
    } else {
      return "";
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) return "";
    
    return date.toLocaleDateString('th-TH');
  };

  if (!start && !end) return "เลือกช่วงวันที่";
  if (start && !end) return format(start);
  if (start && end) return `${format(start)} - ${format(end)}`;
  return "เลือกช่วงวันที่";
};

// Helper function to check if a date is within range
export const isDateInRange = (dateStr: string, startDate: any, endDate: any): boolean => {
  if (!startDate && !endDate) return true;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  
  // Convert start and end dates to proper Date objects
  const start = startDate ? (startDate instanceof Date ? startDate : new Date(startDate)) : null;
  const end = endDate ? (endDate instanceof Date ? endDate : new Date(endDate)) : null;
  
  // Check if converted dates are valid
  const isStartValid = start ? !isNaN(start.getTime()) : true;
  const isEndValid = end ? !isNaN(end.getTime()) : true;
  
  if (!isStartValid && !isEndValid) return true;
  
  if (start && end && isStartValid && isEndValid) {
    // Set time to start/end of day for proper comparison
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);
    
    return date >= startOfDay && date <= endOfDay;
  } else if (start && isStartValid) {
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    return date >= startOfDay;
  } else if (end && isEndValid) {
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);
    return date <= endOfDay;
  }
  
  return true;
};
