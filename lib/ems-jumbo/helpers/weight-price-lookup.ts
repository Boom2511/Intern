/**
 * Weight-Based Price Lookup
 * ค้นหาราคาจากตารางน้ำหนัก
 */

import { EMS_WEIGHT_PRICE_TABLE } from '../data/weight-price-table';

/**
 * หาราคาจากน้ำหนักและ Zone
 * 
 * @param zone - Zone ปลายทาง (1-10)
 * @param chargeableWeight - น้ำหนักที่ใช้คิดราคา (กิโลกรัม)
 * @returns ราคาตามตาราง (บาท) หรือ null ถ้าไม่พบ
 */
export function findWeightPriceByZone(
  zone: number,
  chargeableWeight: number
): number | null {
  if (zone < 1 || zone > 10) {
    throw new Error('Zone ต้องอยู่ระหว่าง 1-10');
  }

  if (chargeableWeight < 0) {
    throw new Error('น้ำหนักต้องไม่ติดลบ');
  }

  // หาช่วงน้ำหนักที่ตรงกับน้ำหนักที่ส่งเข้ามา
  const priceEntry = EMS_WEIGHT_PRICE_TABLE.find(
    entry => chargeableWeight >= entry.minWeight && chargeableWeight < entry.maxWeight
  );

  if (!priceEntry) {
    // ถ้าเกินช่วงสูงสุด ให้ใช้ช่วงสุดท้าย
    const lastEntry = EMS_WEIGHT_PRICE_TABLE[EMS_WEIGHT_PRICE_TABLE.length - 1];
    if (chargeableWeight >= lastEntry.maxWeight) {
      return getZonePrice(lastEntry, zone);
    }
    return null;
  }

  return getZonePrice(priceEntry, zone);
}

/**
 * ดึงราคาจาก entry ตาม zone
 */
function getZonePrice(entry: any, zone: number): number {
  const zoneKey = `zone${zone}` as keyof typeof entry;
  return entry[zoneKey];
}
