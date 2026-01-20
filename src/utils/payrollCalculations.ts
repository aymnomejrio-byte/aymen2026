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