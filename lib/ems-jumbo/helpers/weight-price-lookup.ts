/**
 * Weight-Based Price Lookup
 * ค้นหาราคาจากตารางน้ำหนัก
 */

import { EMS_WEIGHT_PRICE_TABLE } from '../data/weight-price-table';

/**
 * หาราคาจากน้ำหนักและ Zone
 * 
 * Logic: น้ำหนักเกินช่วงให้ใช้ราคาช่วงถัดไป
 * - น้ำหนัก <= 30kg → ใช้ราคาช่วง 30kg
 * - น้ำหนัก 30.01-40kg → ใช้ราคาช่วง 40kg (ช่วงถัดไป)
 * - น้ำหนัก 40.01-50kg → ใช้ราคาช่วง 50kg (ช่วงถัดไป)
 * - และต่อไปเรื่อยๆ
 * 
 * @param zone - Zone ปลายทาง (1-10)
 * @param chargeableWeight - น้ำหนักที่ใช้คิดราคา (กิโลกรัม)
 * @returns ราคาตามตาราง (บาท) หรือ null ถ้าไม่พบ
 */
export function findWeightPriceByZone(
  zone: number,
  chargeableWeight: number
): number | null {
  if (zone < 1 || zone > 10) throw new Error('Zone ต้องอยู่ระหว่าง 1-10');
  if (chargeableWeight < 0) throw new Error('น้ำหนักต้องไม่ติดลบ');

  // Logic: ถ้าน้ำหนักเกินช่วง ให้ใช้ราคาช่วงถัดไป
  // ตัวอย่าง: 31kg เกิน 30kg → หาช่วงที่น้ำหนักอยู่ แล้วใช้ราคาช่วงถัดไป
  
  // หาช่วงที่น้ำหนักอยู่
  const currentIndex = EMS_WEIGHT_PRICE_TABLE.findIndex(
    entry => chargeableWeight > entry.minWeight && chargeableWeight <= entry.maxWeight
  );

  // ถ้าน้ำหนัก <= ช่วงแรก ให้ใช้ราคาช่วงแรก
  if (chargeableWeight <= EMS_WEIGHT_PRICE_TABLE[0].maxWeight) {
    return getZonePrice(EMS_WEIGHT_PRICE_TABLE[0], zone);
  }

  // ถ้าไม่เจอช่วง (น้ำหนักเกินตาราง) ให้ใช้ราคาช่วงสุดท้าย
  if (currentIndex === -1) {
    const lastEntry = EMS_WEIGHT_PRICE_TABLE[EMS_WEIGHT_PRICE_TABLE.length - 1];
    return getZonePrice(lastEntry, zone);
  }

  // ถ้าน้ำหนักอยู่ในช่วง ให้ใช้ราคาของช่วงถัดไป
  // ยกเว้นถ้าเป็นช่วงสุดท้ายแล้ว
  const nextIndex = currentIndex + 1;
  if (nextIndex < EMS_WEIGHT_PRICE_TABLE.length) {
    return getZonePrice(EMS_WEIGHT_PRICE_TABLE[nextIndex], zone);
  }

  // ถ้าเป็นช่วงสุดท้ายแล้ว ใช้ราคาช่วงสุดท้าย
  return getZonePrice(EMS_WEIGHT_PRICE_TABLE[currentIndex], zone);
}

/**
 * ดึงราคาจาก entry ตาม zone
 */
function getZonePrice(entry: any, zone: number): number {
  const zoneKey = `zone${zone}` as keyof typeof entry;
  return entry[zoneKey];
}
