/**
 * EMS Jumbo Type Definitions
 */

export type CalculationMode = 'model' | 'weight';

export interface EMSJumboCalculatorState {
  mode: CalculationMode;
  
  // Model mode
  modelId: string;
  
  // Weight mode
  actualWeight: string;
  width: string;
  length: string;
  height: string;
  
  // Common
  zone: number;
}

export interface EMSJumboCalculationResult {
  mode: CalculationMode;
  basePrice: number;
  surcharge: number;
  totalPrice: number;
  details: {
    actualWeight?: number;
    volumetricWeight?: number;
    chargeableWeight?: number;
    maxSide?: number;
    modelId?: string;
    modelName?: string;
    baseFee?: number; // ค่าบริการอัตราปกติ (ก่อนบวกค่ารับฝาก/นำจ่าย)
    pickupFee?: number; // ค่ารับฝาก ณ ที่อยู่ผู้ฝาก
    deliveryFee?: number; // ค่านำจ่าย ณ ที่อยู่ผู้รับ
    insuranceFee?: number; // ค่าบริการรับประกัน
    insuranceAmount?: number; // วงเงินรับประกัน
  };
}

export interface EMSJumboModel {
  modelId: string;
  modelName: string;
  description: string;
}
