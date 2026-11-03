/**
 * EMS Jumbo Model-Based Pricing Table
 * ตารางราคาสินค้าสำเร็จรูป (Model)
 */

export interface ModelPriceEntry {
  id?: number;
  modelId: string;
  modelName: string;
  description: string;
  category?: string;
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
  zone6: number;
  zone7: number;
  zone8: number;
  zone9: number;
  zone10: number;
}

/**
 * รายการสินค้าสำเร็จรูป (Model) พร้อมราคาแยกตาม Zone
 */
// Import from full table
import { EMS_MODEL_PRICE_TABLE_FULL } from './model-price-table-full';

export const EMS_MODEL_PRICE_TABLE: ModelPriceEntry[] = EMS_MODEL_PRICE_TABLE_FULL;
