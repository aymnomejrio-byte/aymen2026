import { parse, differenceInMinutes, isBefore, isAfter, format } from 'date-fns';

interface AppSettings {
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  break_duration_minutes: number;
  overtime_threshold_hours: number;
}

interface AttendanceTimes {
  checkInTime: string | null; // HH:MM
  checkOutTime: string | null; // HH:MM
}

interface CalculatedAttendance {
  workedHours: number;
  lateMinutes: number;
  overtimeHours: number;
}

export const calculateAttendanceMetrics = (
  times: AttendanceTimes,
  settings: AppSettings | null
): CalculatedAttendance => {
  let workedHours = 0;
  let lateMinutes = 0;
  let overtimeHours = 0;

  if (!settings || !times.checkInTime || !times.checkOutTime) {
    return { workedHours, lateMinutes, overtimeHours };
  }

  const dummyDate = format(new Date(), 'yyyy-MM-dd'); // Use a dummy date for parsing times

  const checkIn = parse(`${dummyDate} ${times.checkInTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const checkOut = parse(`${dummyDate} ${times.checkOutTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const officialStartTime = parse(`${dummyDate} ${settings.start_time.substring(0, 5)}`, 'yyyy-MM-dd HH:mm', new Date());
  // const officialEndTime = parse(`${dummyDate} ${settings.end_time.substring(0, 5)}`, 'yyyy-MM-dd HH:mm', new Date()); // Not directly used for worked hours calculation here

  // Ensure checkOut is after checkIn
  if (isBefore(checkOut, checkIn)) {
    // If check-out is before check-in on the same day, assume no work or invalid entry
    return { workedHours, lateMinutes, overtimeHours };
  }

  // Calculate total minutes worked
  let totalMinutesWorked = differenceInMinutes(checkOut, checkIn);

  // Subtract break duration
  totalMinutesWorked -= settings.break_duration_minutes;

  // Ensure worked minutes are not negative
  if (totalMinutesWorked < 0) {
    totalMinutesWorked = 0;
  }

  workedHours = totalMinutesWorked / 60;

  // Calculate late minutes
  if (isAfter(checkIn, officialStartTime)) {
    lateMinutes = differenceInMinutes(checkIn, officialStartTime);
  }

  // Calculate overtime hours
  if (workedHours > settings.overtime_threshold_hours) {
    overtimeHours = workedHours - settings.overtime_threshold_hours;
  }

  return {
    workedHours: parseFloat(workedHours.toFixed(2)),
    lateMinutes: Math.max(0, lateMinutes), // Ensure not negative
    overtimeHours: parseFloat(overtimeHours.toFixed(2)),
  };
};