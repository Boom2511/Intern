/**
 * EMS Jumbo Insurance Service Fee Calculator
 * ค่าบริการรับประกัน ตามเอกสาร EMS Jumbo Zone 1.pdf หน้า 4
 */

/**
 * Calculate Insurance Fee (ค่าบริการรับประกัน)
 * @param insuranceAmount - วงเงินรับประกัน (บาท)
 * @returns ค่าบริการรับประกัน (บาท) รวมค่าปฏิบัติการแล้ว
 */
export function calculateInsuranceFee(insuranceAmount: number): number {
  if (insuranceAmount <= 0) return 0;
  
  // วงเงินสูงสุด 200,000 บาท
  const maxInsurance = 200000;
  const amount = Math.min(insuranceAmount, maxInsurance);
  
  // ค่าปฏิบัติการ 15 บาท
  const operationFee = 15;
  
  let baseFee = 0;
  
  if (amount <= 20000) {
    // 5 บาท ต่อ 500 บาท (สำหรับวงเงิน ≤ 20,000)
    baseFee = Math.ceil(amount / 500) * 5;
  } else {
    // 6 บาท ต่อ 500 บาท (สำหรับวงเงิน > 20,000)
    baseFee = Math.ceil(amount / 500) * 6;
  }
  
  return baseFee + operationFee;
}

/**
 * Get insurance coverage without service (default coverage)
 * กรณีไม่ใช้บริการรับประกัน ปณท. จะชดใช้ไม่เกิน 3,000 บาท/ชิ้น
 */
export const DEFAULT_INSURANCE_COVERAGE = 3000;

/**
 * Maximum insurance coverage available
 * วงเงินรับประกันสูงสุด 200,000 บาท/ชิ้น
 */
export const MAX_INSURANCE_COVERAGE = 200000;

/**
 * Calculate total with insurance
 * @param baseFee - ค่าบริการอัตราปกติ
 * @param insuranceAmount - วงเงินรับประกัน (0 = ไม่ต้องการประกัน)
 * @returns ค่าบริการรวม
 */
export function calculateTotalWithInsurance(
  baseFee: number,
  insuranceAmount: number
): {
  baseFee: number;
  insuranceFee: number;
  insuranceAmount: number;
  total: number;
} {
  const insuranceFee = insuranceAmount > 0 ? calculateInsuranceFee(insuranceAmount) : 0;
  const total = baseFee + insuranceFee;

  return {
    baseFee,
    insuranceFee,
    insuranceAmount: insuranceAmount > 0 ? Math.min(insuranceAmount, MAX_INSURANCE_COVERAGE) : 0,
    total,
  };
}
