
import { TimeCalibration, TimeRecord } from '../types';

export const getOffsetMs = (keyTime: string, aedTime: string): number => {
  if (!keyTime || !aedTime) return 0;
  return new Date(keyTime).getTime() - new Date(aedTime).getTime();
};

export const formatTimeDisplay = (dateStr: string): string => {
  if (!dateStr || dateStr === 'N/A') return '--:--:--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '--:--:--';
  return d.toTimeString().split(' ')[0];
};

export const calculateTimeDiffSeconds = (start: string, end: string): number => {
  if (!start || !end) return 0;
  
  // Check if ISO Date (contains 'T' like YYYY-MM-DDTHH:mm:ss)
  if (start.includes('T') && end.includes('T')) {
      const diff = new Date(end).getTime() - new Date(start).getTime();
      return diff / 1000;
  }
  
  // Assume HH:MM:SS
  const toSeconds = (t: string) => {
      const parts = t.split(':').map(Number);
      if (parts.length < 2) return 0;
      const h = parts[0] || 0;
      const m = parts[1] || 0;
      const s = parts[2] || 0;
      return h * 3600 + m * 60 + s;
  };
  
  let diff = toSeconds(end) - toSeconds(start);
  if (diff < 0) diff += 86400; // Handle midnight crossing (add 24 hours)
  return diff;
};

export const calculateCorrectedAedTime = (
  recordKey: keyof TimeRecord,
  recordData: any,
  calibration: any
): Date | null => {
  // Direct AED time fields
  if (typeof recordData === 'string') {
    if (recordData === 'N/A') return null; // Handle N/A
    return recordData ? new Date(recordData) : null;
  }

  // Fields with EMT1/2/3
  const emt1 = recordData.emt1;
  const emt2 = recordData.emt2;
  const emt3 = recordData.emt3;

  // Handle N/A in EMT fields
  if (emt1 === 'N/A' || emt2 === 'N/A' || emt3 === 'N/A') return null;

  const emt1Time = emt1 ? new Date(emt1).getTime() : null;
  const emt2Time = emt2 ? new Date(emt2).getTime() : null;
  const emt3Time = emt3 ? new Date(emt3).getTime() : null;

  const offset1 = getOffsetMs(calibration.emt1.keyTime, calibration.emt1.aedTime);
  const offset2 = getOffsetMs(calibration.emt2.keyTime, calibration.emt2.aedTime);
  const offset3 = getOffsetMs(calibration.emt3.keyTime, calibration.emt3.aedTime);

  // Priority: EMT1 -> EMT2 -> EMT3
  // Formula: Adjusted AED Time = EMT_Entry_Time - Offset
  
  if (emt1Time) return new Date(emt1Time - offset1);
  if (emt2Time) return new Date(emt2Time - offset2);
  if (emt3Time) return new Date(emt3Time - offset3);

  return null;
};
