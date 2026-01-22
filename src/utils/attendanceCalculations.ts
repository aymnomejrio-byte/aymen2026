import { parse, differenceInMinutes, isBefore, isAfter, format, getDay } from 'date-fns';

interface DaySettings {
  day: string;
  is_work_day: boolean;
  start_time: string | null; // HH:MM
  end_time: string | null; // HH:MM
  break_duration_minutes: number | null;
  overtime_threshold_hours: number | null;
  overtime_rate_multiplier: number | null;
}

interface AppSettings {
  daily_settings: DaySettings[];
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

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const calculateAttendanceMetrics = (
  attendanceDate: Date, // Pass the full date now
  times: AttendanceTimes,
  appSettings: AppSettings | null
): CalculatedAttendance => {
  let workedHours = 0;
  let lateMinutes = 0;
  let overtimeHours = 0;

  if (!appSettings || !appSettings.daily_settings || !times.checkInTime || !times.checkOutTime) {
    return { workedHours, lateMinutes, overtimeHours };
  }

  const dayOfWeek = dayNames[getDay(attendanceDate)];
  const daySetting = appSettings.daily_settings.find(setting => setting.day === dayOfWeek);

  if (!daySetting || !daySetting.is_work_day || !daySetting.start_time || !daySetting.end_time || daySetting.break_duration_minutes === null || daySetting.overtime_threshold_hours === null) {
    return { workedHours, lateMinutes, overtimeHours }; // Not a work day or essential settings are missing
  }

  const dummyDate = format(attendanceDate, 'yyyy-MM-dd'); // Use the actual attendance date for parsing times

  const checkIn = parse(`${dummyDate} ${times.checkInTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const checkOut = parse(`${dummyDate} ${times.checkOutTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const officialStartTime = parse(`${dummyDate} ${daySetting.start_time}`, 'yyyy-MM-dd HH:mm', new Date());
  // const officialEndTime = parse(`${dummyDate} ${daySetting.end_time}`, 'yyyy-MM-dd HH:mm', new Date()); // Not directly used for worked hours calculation here

  // Ensure checkOut is after checkIn
  if (isBefore(checkOut, checkIn)) {
    return { workedHours, lateMinutes, overtimeHours };
  }

  // Calculate total minutes worked
  let totalMinutesWorked = differenceInMinutes(checkOut, checkIn);

  // Subtract break duration
  totalMinutesWorked -= daySetting.break_duration_minutes;

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
  if (workedHours > daySetting.overtime_threshold_hours) {
    overtimeHours = workedHours - daySetting.overtime_threshold_hours;
  }

  return {
    workedHours: parseFloat(workedHours.toFixed(2)),
    lateMinutes: Math.max(0, lateMinutes), // Ensure not negative
    overtimeHours: parseFloat(overtimeHours.toFixed(2)),
  };
};