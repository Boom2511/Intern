/**
 * Zipcode Lookup Helper
 * แปลงรหัสไปรษณีย์เป็นจังหวัดและ Zone
 * ใช้ thai-address-database สำหรับข้อมูลรหัสไปรษณีย์ที่ถูกต้อง
 */

import { PROVINCE_ZONE_MAPPING } from '../data/zone-mapping';

// Import thai-address-database
// @ts-ignore
import addressDb from 'thai-address-database';

/**
 * Thai Address Database Integration
 * ใช้ thai-address-database สำหรับข้อมูลที่ถูกต้อง 100%
 */

// Interface for Thai Address Database result
interface ThaiAddressResult {
  province: string;
  district: string;
  subdistrict: string;
  zipcode: number;
}

/**
 * Search zipcode from thai-address-database
 */
function searchZipcode(zipcode: string): ThaiAddressResult[] {
  try {
    const results = addressDb.searchAddressByZipcode(zipcode);
    return results || [];
  } catch (error) {
    console.warn('Thai Address DB error:', error);
    return [];
  }
}

/**
 * ค้นหาจังหวัดจากรหัสไปรษณีย์
 * ใช้ thai-address-database สำหรับความแม่นยำ 100%
 */
export function getProvinceFromZipcode(zipcode: string): string | null {
  if (!zipcode) return null;
  
  // Remove spaces and trim
  const cleanZip = zipcode.trim().replace(/\s+/g, '');
  
  // ต้องเป็นตัวเลข 5 หลัก
  if (!/^\d{5}$/.test(cleanZip)) {
    return null;
  }
  
  // ค้นหาจาก thai-address-database
  const results = searchZipcode(cleanZip);
  
  if (results.length > 0) {
    // ใช้ผลลัพธ์แรก (province จาก database)
    return results[0].province;
  }
  
  return null;
}

/**
 * ค้นหา Zone จากรหัสไปรษณีย์
 */
export function getZoneFromZipcode(zipcode: string): number | null {
  const province = getProvinceFromZipcode(zipcode);
  if (!province) return null;
  
  const mapping = PROVINCE_ZONE_MAPPING.find(m => m.province === province);
  return mapping ? mapping.zone : null;
}

/**
 * ค้นหาข้อมูลเต็มจากรหัสไปรษณีย์
 */
export function getLocationFromZipcode(zipcode: string): {
  province: string;
  zone: number;
} | null {
  const province = getProvinceFromZipcode(zipcode);
  if (!province) return null;
  
  const mapping = PROVINCE_ZONE_MAPPING.find(m => m.province === province);
  if (!mapping) return null;
  
  return {
    province,
    zone: mapping.zone,
  };
}

/**
 * ดึงข้อมูลที่อยู่เต็มจากรหัสไปรษณีย์
 */
export function getAddressInfoFromZipcode(zipcode: string): ThaiAddressResult[] {
  const cleanZip = zipcode.trim().replace(/\s+/g, '');
  if (!/^\d{5}$/.test(cleanZip)) return [];
  return searchZipcode(cleanZip);
}

/**
 * Validate รหัสไปรษณีย์
 */
export function isValidZipcode(zipcode: string): boolean {
  const cleanZip = zipcode.trim().replace(/\s+/g, '');
  if (!/^\d{5}$/.test(cleanZip)) return false;
  
  const results = searchZipcode(cleanZip);
  return results.length > 0;
}
