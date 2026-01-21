/**
 * Model-Based Price Lookup
 * ค้นหาราคาจาก Model สินค้าสำเร็จรูป
 */

import { EMS_MODEL_PRICE_TABLE } from '../data/model-price-table';

/**
 * หาราคาจาก Model ID และ Zone
 * 
 * @param modelId - รหัส Model สินค้า
 * @param zone - Zone ปลายทาง (1-10)
 * @returns ราคาตามตาราง (บาท) หรือ null ถ้าไม่พบ
 */
export function findModelPriceByZone(
  modelId: string,
  zone: number
): number | null {
  if (zone < 1 || zone > 10) {
    throw new Error('Zone ต้องอยู่ระหว่าง 1-10');
  }

  const model = EMS_MODEL_PRICE_TABLE.find(m => m.modelId === modelId);
  
  if (!model) {
    return null;
  }

  const zoneKey = `zone${zone}` as keyof typeof model;
  const value = model[zoneKey] as unknown as number | undefined;
  return value ?? null;
}

/**
 * ดึงข้อมูล Model ทั้งหมด
 */
export function getAllModels() {
  return EMS_MODEL_PRICE_TABLE;
}

/**
 * ดึงข้อมูล Model เดียว
 */
export function getModelById(modelId: string) {
  return EMS_MODEL_PRICE_TABLE.find(m => m.modelId === modelId);
}
