import { format, getDay, getDaysInMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface PayrollInputs {
  baseSalary: number;
  overtimePay: number;
  deductions: number;
}

interface CalculatedPayroll {
  netPay: number;
}

export const calculateNetPay = (inputs: PayrollInputs): CalculatedPayroll => {
  const { baseSalary, overtimePay, deductions } = inputs;

  let netPay = baseSalary + overtimePay - deductions;

  if (netPay < 0) {
    netPay = 0; // Le salaire net ne peut pas être négatif
  }

  return {
    netPay: parseFloat(netPay.toFixed(2)),
  };
};

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

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const getAutomatedOvertimePay = async (
  employeeId: string,
  month: number,
  year: number,
  userId: string
): Promise<number> => {
  if (!employeeId || !userId) return 0;

  // 1. Fetch attendance records for the specified employee, month, and year
  const { data: attendanceRecords, error: attendanceError } = await supabase
    .from("attendance")
    .select("date, overtime_hours")
    .eq("employee_id", employeeId)
    .eq("user_id", userId)
    .gte("date", format(new Date(year, month - 1, 1), "yyyy-MM-dd"))
    .lte("date", format(new Date(year, month - 1, getDaysInMonth(new Date(year, month - 1))), "yyyy-MM-dd"));

  if (attendanceError) {
    console.error("[getAutomatedOvertimePay] Error fetching attendance records:", attendanceError);
    throw attendanceError;
  }

  if (!attendanceRecords || attendanceRecords.length === 0) {
    return 0;
  }

  // 2. Fetch app settings for daily overtime rate multipliers
  const { data: appSettings, error: settingsError } = await supabase
    .from("app_settings")
    .select("daily_settings")
    .eq("user_id", userId)
    .single();

  if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error("[getAutomatedOvertimePay] Error fetching app settings:", settingsError);
    throw settingsError;
  }

  let totalOvertimePay = 0;

  attendanceRecords.forEach(record => {
    const recordDate = new Date(record.date);
    const dayOfWeek = dayNames[getDay(recordDate)];
    const daySetting = appSettings?.daily_settings?.find((setting: DaySettings) => setting.day === dayOfWeek);

    const overtimeHours = record.overtime_hours || 0;
    const overtimeRateMultiplier = daySetting?.overtime_rate_multiplier || 1; // Default to 1 if not set

    totalOvertimePay += overtimeHours * overtimeRateMultiplier;
  });

  return parseFloat(totalOvertimePay.toFixed(2));
};