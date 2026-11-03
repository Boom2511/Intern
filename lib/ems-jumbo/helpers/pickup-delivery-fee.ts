/**
 * EMS Jumbo Pickup & Delivery Service Fee Calculator
 * ค่าบริการรับฝาก และ นำจ่าย ตามเอกสาร EMS Jumbo Pick Up.pdf
 */

/**
 * Pickup & Delivery Fee Table
 * ค่าบริการเพิ่มเติมขึ้นอยู่กับค่าบริการอัตราปกติ
 */
const PICKUP_DELIVERY_FEE_TABLE = [
  { maxBaseFee: 300, fee: 60 },
  { maxBaseFee: 500, fee: 90 },
  { maxBaseFee: 1000, fee: 180 },
  { maxBaseFee: 1500, fee: 250 },
  { maxBaseFee: 2000, fee: 300 },
  { maxBaseFee: 2500, fee: 350 },
  { maxBaseFee: 3000, fee: 400 },
  { maxBaseFee: 5000, fee: 450 },
  { maxBaseFee: Infinity, fee: 500 }, // เกินกว่า 5,000
];

/**
 * Calculate Pickup Fee (ค่ารับฝาก ณ ที่อยู่ผู้ฝาก)
 * @param baseFee - ค่าบริการอัตราปกติ (บาท)
 * @returns ค่าบริการรับฝาก (บาท)
 */
export function calculatePickupFee(baseFee: number): number {
  for (const tier of PICKUP_DELIVERY_FEE_TABLE) {
    if (baseFee <= tier.maxBaseFee) {
      return tier.fee;
    }
  }
  return 500; // Default for > 5000
}

/**
 * Calculate Delivery Fee (ค่านำจ่าย ณ ที่อยู่ผู้รับ)
 * @param baseFee - ค่าบริการอัตราปกติ (บาท)
 * @returns ค่าบริการนำจ่าย (บาท)
 */
export function calculateDeliveryFee(baseFee: number): number {
  // ค่านำจ่ายเท่ากับค่ารับฝาก (ตามตารางในเอกสาร)
  return calculatePickupFee(baseFee);
}

/**
 * Calculate Total with Pickup/Delivery Services
 * @param baseFee - ค่าบริการอัตราปกติ (บาท)
 * @param withPickup - เลือกบริการรับฝาก
 * @param withDelivery - เลือกบริการนำจ่าย
 * @returns ค่าบริการรวม
 */
export function calculateTotalWithServices(
  baseFee: number,
  withPickup: boolean = false,
  withDelivery: boolean = false
): {
  baseFee: number;
  pickupFee: number;
  deliveryFee: number;
  total: number;
} {
  const pickupFee = withPickup ? calculatePickupFee(baseFee) : 0;
  const deliveryFee = withDelivery ? calculateDeliveryFee(baseFee) : 0;
  const total = baseFee + pickupFee + deliveryFee;

  return {
    baseFee,
    pickupFee,
    deliveryFee,
    total,
  };
}
