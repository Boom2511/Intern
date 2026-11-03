/**
 * EMS Jumbo Total Calculator
 * รวมการคำนวณทั้งหมดเข้าด้วยกัน
 */

import { calculateVolumetricWeight } from './volumetric-weight';
import { getChargeableWeight } from './chargeable-weight';
import { findWeightPriceByZone } from './weight-price-lookup';
import { findModelPriceByZone } from './model-price-lookup';
import { calculateOversizeSurcharge } from './oversize-surcharge';

export type CalculationMode = 'model' | 'weight';

export interface EMSJumboInput {
  mode: CalculationMode;
  
  // สำหรับโหมด Model
  modelId?: string;
  
  // สำหรับโหมดน้ำหนัก
  actualWeight?: number;
  width?: number;
  length?: number;
  height?: number;
  
  // ทั้งสองโหมด
  zone: number;
}

export interface EMSJumboResult {
  mode: CalculationMode;
  basePrice: number;
  surcharge: number;
  totalPrice: number;
  
  // รายละเอียดเพิ่มเติม
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

/**
 * คำนวณราคา EMS Jumbo ทั้งหมด
 * 
 * @param input - ข้อมูลพัสดุ
 * @returns ผลการคำนวณราคา
 */
export function calculateEMSJumboTotal(input: EMSJumboInput): EMSJumboResult {
  const { mode, zone } = input;
  
  let basePrice = 0;
  let surcharge = 0;
  const details: EMSJumboResult['details'] = {};

  if (mode === 'model') {
    // โหมด Model สำเร็จรูป
    if (!input.modelId) {
      throw new Error('กรุณาระบุ Model ID');
    }

    const price = findModelPriceByZone(input.modelId, zone);
    if (price === null) {
      throw new Error('ไม่พบราคาสำหรับ Model นี้');
    }

    basePrice = price;
    details.modelId = input.modelId;
    
    // Model ไม่มีค่าบริการเพิ่ม (เว้นแต่ระบุไว้เป็นอย่างอื่น)
    surcharge = 0;

  } else {
    // โหมดคำนวณจากน้ำหนัก
    if (
      input.actualWeight === undefined ||
      input.width === undefined ||
      input.length === undefined ||
      input.height === undefined
    ) {
      throw new Error('กรุณาระบุน้ำหนักและขนาดครบถ้วน');
    }

    // 1. คำนวณน้ำหนักปริมาตร
    const volumetricWeight = calculateVolumetricWeight(
      input.width,
      input.length,
      input.height
    );

    // 2. หาน้ำหนักที่ใช้คิดราคา
    const chargeableWeight = getChargeableWeight(
      input.actualWeight,
      volumetricWeight
    );

    // 3. หาราคาตามน้ำหนัก
    const price = findWeightPriceByZone(zone, chargeableWeight);
    if (price === null) {
      throw new Error('ไม่พบราคาสำหรับน้ำหนักนี้');
    }

    basePrice = price;

    // 4. คำนวณค่าบริการเพิ่ม
    surcharge = calculateOversizeSurcharge(
      input.width,
      input.length,
      input.height
    );

    // เก็บรายละเอียด
    details.actualWeight = input.actualWeight;
    details.volumetricWeight = volumetricWeight;
    details.chargeableWeight = chargeableWeight;
    details.maxSide = Math.max(input.width, input.length, input.height);
  }

  // รวมราคา
  const totalPrice = basePrice + surcharge;

  return {
    mode,
    basePrice,
    surcharge,
    totalPrice,
    details,
  };
}
