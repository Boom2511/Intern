/**
 * EMS Jumbo Zone Mapping
 * แมพจังหวัด/รหัสไปรษณีย์ กับ Zone
 */

export interface ProvinceZoneMapping {
  province: string;
  zone: number;
  zipCodePrefix?: string[]; // รหัสไปรษณีย์ขึ้นต้น
}

/**
 * แมพจังหวัดไทยกับ Zone 1-10
 */
/**
 * Zone Mapping จากเอกสาร EMS Jumbo
 */
export const PROVINCE_ZONE_MAPPING: ProvinceZoneMapping[] = [
  // โซน 1: กรุงเทพมหานคร นนทบุรี ปทุมธานี สมุทรปราการ
  { province: 'กรุงเทพมหานคร', zone: 1, zipCodePrefix: ['10'] },
  { province: 'นนทบุรี', zone: 1, zipCodePrefix: ['11'] },
  { province: 'ปทุมธานี', zone: 1, zipCodePrefix: ['12'] },
  { province: 'สมุทรปราการ', zone: 1, zipCodePrefix: ['10', '11'] },
  
  // โซน 2: สระแก้ว ปราจีนบุรี ฉะเชิงเทรา ชลบุรี ระยอง จันทบุรี ตราด
  { province: 'สระแก้ว', zone: 2, zipCodePrefix: ['27'] },
  { province: 'ปราจีนบุรี', zone: 2, zipCodePrefix: ['25'] },
  { province: 'ฉะเชิงเทรา', zone: 2, zipCodePrefix: ['24'] },
  { province: 'ชลบุรี', zone: 2, zipCodePrefix: ['20'] },
  { province: 'ระยอง', zone: 2, zipCodePrefix: ['21'] },
  { province: 'จันทบุรี', zone: 2, zipCodePrefix: ['22'] },
  { province: 'ตราด', zone: 2, zipCodePrefix: ['23'] },
  
  // โซน 3: นครปฐม กาญจนบุรี ราชบุรี สมุทรสาคร สมุทรสงคราม เพชรบุรี ประจวบคีรีขันธ์
  { province: 'นครปฐม', zone: 3, zipCodePrefix: ['73'] },
  { province: 'กาญจนบุรี', zone: 3, zipCodePrefix: ['71'] },
  { province: 'ราชบุรี', zone: 3, zipCodePrefix: ['70'] },
  { province: 'สมุทรสาคร', zone: 3, zipCodePrefix: ['74'] },
  { province: 'สมุทรสงคราม', zone: 3, zipCodePrefix: ['75'] },
  { province: 'เพชรบุรี', zone: 3, zipCodePrefix: ['76'] },
  { province: 'ประจวบคีรีขันธ์', zone: 3, zipCodePrefix: ['77'] },
  
  // โซน 4: อุทัยธานี สิงห์บุรี ชัยนาท ลพบุรี สระบุรี อ่างทอง พระนครศรีอยุธยา สุพรรณบุรี นครนายก
  { province: 'อุทัยธานี', zone: 4, zipCodePrefix: ['61'] },
  { province: 'สิงห์บุรี', zone: 4, zipCodePrefix: ['16'] },
  { province: 'ชัยนาท', zone: 4, zipCodePrefix: ['17'] },
  { province: 'ลพบุรี', zone: 4, zipCodePrefix: ['15'] },
  { province: 'สระบุรี', zone: 4, zipCodePrefix: ['18'] },
  { province: 'อ่างทอง', zone: 4, zipCodePrefix: ['14'] },
  { province: 'พระนครศรีอยุธยา', zone: 4, zipCodePrefix: ['13'] },
  { province: 'สุพรรณบุรี', zone: 4, zipCodePrefix: ['72'] },
  { province: 'นครนายก', zone: 4, zipCodePrefix: ['26'] },
  
  // โซน 5: อุตรดิตถ์ สุโขทัย ตาก พิษณุโลก กำแพงเพชร พิจิตร เพชรบูรณ์ นครสวรรค์
  { province: 'อุตรดิตถ์', zone: 5, zipCodePrefix: ['53'] },
  { province: 'สุโขทัย', zone: 5, zipCodePrefix: ['64'] },
  { province: 'ตาก', zone: 5, zipCodePrefix: ['63'] },
  { province: 'พิษณุโลก', zone: 5, zipCodePrefix: ['65'] },
  { province: 'กำแพงเพชร', zone: 5, zipCodePrefix: ['62'] },
  { province: 'พิจิตร', zone: 5, zipCodePrefix: ['66'] },
  { province: 'เพชรบูรณ์', zone: 5, zipCodePrefix: ['67'] },
  { province: 'นครสวรรค์', zone: 5, zipCodePrefix: ['60'] },
  
  // โซน 6: แม่ฮ่องสอน เชียงราย พะเยา เชียงใหม่ ลำพูน น่าน ลำปาง แพร่
  { province: 'แม่ฮ่องสอน', zone: 6, zipCodePrefix: ['58'] },
  { province: 'เชียงราย', zone: 6, zipCodePrefix: ['57'] },
  { province: 'พะเยา', zone: 6, zipCodePrefix: ['56'] },
  { province: 'เชียงใหม่', zone: 6, zipCodePrefix: ['50'] },
  { province: 'ลำพูน', zone: 6, zipCodePrefix: ['51'] },
  { province: 'น่าน', zone: 6, zipCodePrefix: ['55'] },
  { province: 'ลำปาง', zone: 6, zipCodePrefix: ['52'] },
  { province: 'แพร่', zone: 6, zipCodePrefix: ['54'] },
  
  // โซน 7: กาฬสินธุ์ มุกดาหาร ร้อยเอ็ด มหาสารคาม ชัยภูมิ อำนาจเจริญ ยโสธร ศรีสะเกษ อุบลราชธานี บุรีรัมย์ สุรินทร์ นครราชสีมา
  { province: 'กาฬสินธุ์', zone: 7, zipCodePrefix: ['46'] },
  { province: 'มุกดาหาร', zone: 7, zipCodePrefix: ['49'] },
  { province: 'ร้อยเอ็ด', zone: 7, zipCodePrefix: ['45'] },
  { province: 'มหาสารคาม', zone: 7, zipCodePrefix: ['44'] },
  { province: 'ชัยภูมิ', zone: 7, zipCodePrefix: ['36'] },
  { province: 'อำนาจเจริญ', zone: 7, zipCodePrefix: ['37'] },
  { province: 'ยโสธร', zone: 7, zipCodePrefix: ['35'] },
  { province: 'ศรีสะเกษ', zone: 7, zipCodePrefix: ['33'] },
  { province: 'อุบลราชธานี', zone: 7, zipCodePrefix: ['34'] },
  { province: 'บุรีรัมย์', zone: 7, zipCodePrefix: ['31'] },
  { province: 'สุรินทร์', zone: 7, zipCodePrefix: ['32'] },
  { province: 'นครราชสีมา', zone: 7, zipCodePrefix: ['30'] },
  
  // โซน 8: หนองคาย บึงกาฬ เลย อุดรธานี นครพนม สกลนคร หนองบัวลำภู ขอนแก่น
  { province: 'หนองคาย', zone: 8, zipCodePrefix: ['43'] },
  { province: 'บึงกาฬ', zone: 8, zipCodePrefix: ['38'] },
  { province: 'เลย', zone: 8, zipCodePrefix: ['42'] },
  { province: 'อุดรธานี', zone: 8, zipCodePrefix: ['41'] },
  { province: 'นครพนม', zone: 8, zipCodePrefix: ['48'] },
  { province: 'สกลนคร', zone: 8, zipCodePrefix: ['47'] },
  { province: 'หนองบัวลำภู', zone: 8, zipCodePrefix: ['39'] },
  { province: 'ขอนแก่น', zone: 8, zipCodePrefix: ['40'] },
  
  // โซน 9: ชุมพร ระนอง สุราษฎร์ธานี พังงา นครศรีธรรมราช
  { province: 'ชุมพร', zone: 9, zipCodePrefix: ['86'] },
  { province: 'ระนอง', zone: 9, zipCodePrefix: ['85'] },
  { province: 'สุราษฎร์ธานี', zone: 9, zipCodePrefix: ['84'] },
  { province: 'พังงา', zone: 9, zipCodePrefix: ['82'] },
  { province: 'นครศรีธรรมราช', zone: 9, zipCodePrefix: ['80'] },
  
  // โซน 10: กระบี่ ภูเก็ต ตรัง พัทลุง สงขลา ปัตตานี สตูล ยะลา นราธิวาส
  { province: 'กระบี่', zone: 10, zipCodePrefix: ['81'] },
  { province: 'ภูเก็ต', zone: 10, zipCodePrefix: ['83'] },
  { province: 'ตรัง', zone: 10, zipCodePrefix: ['92'] },
  { province: 'พัทลุง', zone: 10, zipCodePrefix: ['93'] },
  { province: 'สงขลา', zone: 10, zipCodePrefix: ['90'] },
  { province: 'ปัตตานี', zone: 10, zipCodePrefix: ['94'] },
  { province: 'สตูล', zone: 10, zipCodePrefix: ['91'] },
  { province: 'ยะลา', zone: 10, zipCodePrefix: ['95'] },
  { province: 'นราธิวาส', zone: 10, zipCodePrefix: ['96'] },
];

/**
 * หา Zone จากชื่อจังหวัด
 */
export function getZoneByProvince(province: string): number | null {
  const mapping = PROVINCE_ZONE_MAPPING.find(m => m.province === province);
  return mapping ? mapping.zone : null;
}

/**
 * หา Zone จากรหัสไปรษณีย์
 */
export function getZoneByZipCode(zipCode: string): number | null {
  const prefix = zipCode.substring(0, 2);
  const mapping = PROVINCE_ZONE_MAPPING.find(m => 
    m.zipCodePrefix?.some(p => prefix.startsWith(p))
  );
  return mapping ? mapping.zone : null;
}

/**
 * ดึงรายชื่อจังหวัดทั้งหมดแยกตาม Zone
 */
export function getProvincesByZone(zone: number): string[] {
  return PROVINCE_ZONE_MAPPING
    .filter(m => m.zone === zone)
    .map(m => m.province);
}
