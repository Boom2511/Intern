/**
 * Chargeable Weight Calculator
 * หาน้ำหนักที่ใช้คิดราคา (เลือกค่าที่มากกว่าระหว่างน้ำหนักจริงกับน้ำหนักปริมาตร)
 */

/**
 * หาน้ำหนักที่ใช้คิดราคา
 * ตามระเบียบ EMS Jumbo: ใช้น้ำหนักที่มากกว่าระหว่างน้ำหนักจริงกับน้ำหนักปริมาตร
 * 
 * @param actualWeight - น้ำหนักจริง (กิโลกรัม)
 * @param volumetricWeight - น้ำหนักปริมาตร (กิโลกรัม)
 * @returns น้ำหนักที่ใช้คิดราคา (กิโลกรัม)
 */
export function getChargeableWeight(
  actualWeight: number,
  volumetricWeight: number
): number {
  if (actualWeight < 0 || volumetricWeight < 0) {
    throw new Error('น้ำหนักต้องไม่ติดลบ');
  }

  return Math.max(actualWeight, volumetricWeight);
}
