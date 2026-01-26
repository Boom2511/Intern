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
  if (zone < 1 || zone > 10) throw new Error('Zone ต้องอยู่ระหว่าง 1-10');
  if (chargeableWeight < 0) throw new Error('น้ำหนักต้องไม่ติดลบ');

  // Logic: weight must be GREATER THAN OR EQUAL to min and LESS THAN max
  // Example: 30.0kg to 39.9kg falls into the 30-40 tier
  // 30.0 uses rate 30, 40.0 uses rate 40
  let priceEntry = EMS_WEIGHT_PRICE_TABLE.find(
    entry => chargeableWeight >= entry.minWeight && chargeableWeight < entry.maxWeight
  );

  // Handle the edge case if weight exceeds the max in table
  // or if no entry is found
  if (!priceEntry) {
    const lastEntry = EMS_WEIGHT_PRICE_TABLE[EMS_WEIGHT_PRICE_TABLE.length - 1];
    // If weight is >= last entry's minWeight, use last entry
    if (chargeableWeight >= lastEntry.minWeight) {
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
