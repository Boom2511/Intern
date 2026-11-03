/**
 * Oversize Surcharge Calculator
 * คำนวณค่าบริการเพิ่มจากขนาดด้านใดด้านหนึ่งเกิน
 */

/**
 * คำนวณค่าบริการเพิ่มจากขนาด
 * 
 * ตามระเบียบ EMS Jumbo:
 * - >100 – 150 ซม. : +300 บาท
 * - >150 – 200 ซม. : +500 บาท
 * - >200 – 300 ซม. : +1,000 บาท
 * 
 * @param width - ความกว้าง (เซนติเมตร)
 * @param length - ความยาว (เซนติเมตร)
 * @param height - ความสูง (เซนติเมตร)
 * @returns ค่าบริการเพิ่ม (บาท)
 */
export function calculateOversizeSurcharge(
  width: number,
  length: number,
  height: number
): number {
  if (width <= 0 || length <= 0 || height <= 0) {
    throw new Error('ขนาดต้องมากกว่า 0');
  }

  // หาด้านที่ยาวที่สุด
  const maxSide = Math.max(width, length, height);

  // ตรวจสอบตามเงื่อนไข
  if (maxSide > 200 && maxSide <= 300) {
    return 1000;
  } else if (maxSide > 150 && maxSide <= 200) {
    return 500;
  } else if (maxSide > 100 && maxSide <= 150) {
    return 300;
  }

  // ไม่มีค่าบริการเพิ่ม
  return 0;
}
