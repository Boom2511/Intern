/**
 * EMS Jumbo Model-Based Pricing Table (Full from PDF)
 * ตารางราคาสินค้าสำเร็จรูปจากเอกสาร EMS Jumbo
 */

export interface ModelPriceEntry {
  id: number;
  modelId: string;
  modelName: string;
  description: string;
  category: string;
  keywords?: string[]; // Keywords for search
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
 * รายการสินค้าสำเร็จรูป (Model) จากเอกสาร EMS Jumbo
 */
export const EMS_MODEL_PRICE_TABLE_FULL: ModelPriceEntry[] = [
  // กลุ่มเครื่องใช้ไฟฟ้า
  { id: 1, modelId: 'COMPUTER', modelName: 'คอมพิวเตอร์', description: 'คอมพิวเตอร์(รวม CPU กรณีใส่กล่องเดียวกันหรือมัดติดกัน)', category: 'เครื่องใช้ไฟฟ้า', keywords: ['computer', 'pc', 'cpu', 'คอม', 'พีซี'], zone1: 200, zone2: 250, zone3: 250, zone4: 250, zone5: 250, zone6: 250, zone7: 250, zone8: 250, zone9: 250, zone10: 250 },
  { id: 2, modelId: 'TV_21', modelName: 'โทรทัศน์ 21"', description: 'โทรทัศน์ไม่เกิน 21 นิ้ว', category: 'เครื่องใช้ไฟฟ้า', keywords: ['tv', 'television', 'ทีวี', 'โทรทัศน์', '21', 'ยี่สิบเอ็ด'], zone1: 480, zone2: 480, zone3: 480, zone4: 480, zone5: 480, zone6: 670, zone7: 580, zone8: 670, zone9: 670, zone10: 670 },
  { id: 3, modelId: 'TV_29', modelName: 'โทรทัศน์ 29"', description: 'โทรทัศน์ไม่เกิน 29 นิ้ว', category: 'เครื่องใช้ไฟฟ้า', keywords: ['tv', 'television', 'ทีวี', 'โทรทัศน์', '29', 'ยี่สิบเก้า'], zone1: 720, zone2: 720, zone3: 720, zone4: 720, zone5: 720, zone6: 1010, zone7: 860, zone8: 1010, zone9: 1010, zone10: 1010 },
  { id: 4, modelId: 'TV_40', modelName: 'โทรทัศน์ 40"', description: 'โทรทัศน์เกิน 29 นิ้ว แต่ไม่เกิน 40 นิ้ว', category: 'เครื่องใช้ไฟฟ้า', keywords: ['tv', 'television', 'ทีวี', 'โทรทัศน์', '40', 'สี่สิบ'], zone1: 900, zone2: 900, zone3: 900, zone4: 900, zone5: 900, zone6: 1260, zone7: 1080, zone8: 1260, zone9: 1260, zone10: 1260 },
  { id: 5, modelId: 'LCD_42', modelName: 'LCD/LED TV 42"', description: 'LCD TV, LED TV, Plasma TV ไม่เกิน 42 นิ้ว', category: 'เครื่องใช้ไฟฟ้า', keywords: ['lcd', 'led', 'tv', 'plasma', 'ทีวี', 'โทรทัศน์', '42', 'สี่สิบสอง', 'แอลซีดี', 'แอลอีดี'], zone1: 600, zone2: 600, zone3: 600, zone4: 600, zone5: 600, zone6: 840, zone7: 720, zone8: 840, zone9: 840, zone10: 840 },
  { id: 6, modelId: 'LCD_50', modelName: 'LCD/LED TV 50"', description: 'LCD TV, LED TV, Plasma TV ไม่เกิน 50 นิ้ว', category: 'เครื่องใช้ไฟฟ้า', keywords: ['lcd', 'led', 'tv', 'plasma', 'ทีวี', 'โทรทัศน์', '50', 'ห้าสิบ', 'แอลซีดี', 'แอลอีดี'], zone1: 900, zone2: 900, zone3: 900, zone4: 900, zone5: 900, zone6: 1260, zone7: 1080, zone8: 1260, zone9: 1260, zone10: 1260 },
  { id: 7, modelId: 'FRIDGE_12', modelName: 'ตู้เย็น 12Q', description: 'ตู้เย็น ขนาดไม่เกิน 12 คิว', category: 'เครื่องใช้ไฟฟ้า', keywords: ['fridge', 'refrigerator', 'ตู้เย็น', 'ตูเย็น', '12', 'สิบสอง', 'คิว'], zone1: 900, zone2: 900, zone3: 900, zone4: 900, zone5: 900, zone6: 1260, zone7: 1080, zone8: 1260, zone9: 1260, zone10: 1260 },
  { id: 8, modelId: 'FRIDGE_15', modelName: 'ตู้เย็น 15Q', description: 'ตู้เย็น ขนาดไม่เกิน 15 คิว', category: 'เครื่องใช้ไฟฟ้า', keywords: ['fridge', 'refrigerator', 'ตู้เย็น', 'ตูเย็น', '15', 'สิบห้า', 'คิว'], zone1: 960, zone2: 960, zone3: 960, zone4: 960, zone5: 960, zone6: 1340, zone7: 1150, zone8: 1340, zone9: 1340, zone10: 1340 },
  { id: 9, modelId: 'AC_WALL', modelName: 'แอร์แขวน', description: 'เครื่องปรับอากาศแบบแขวนผนัง', category: 'เครื่องใช้ไฟฟ้า', keywords: ['ac', 'air', 'แอร์', 'แอร์แขวน', 'เครื่องปรับอากาศ', 'ปรับอากาศ'], zone1: 720, zone2: 720, zone3: 720, zone4: 720, zone5: 720, zone6: 1010, zone7: 860, zone8: 1010, zone9: 1010, zone10: 1010 },
  { id: 10, modelId: 'AC_FLOOR', modelName: 'แอร์ตั้งพื้น', description: 'เครื่องปรับอากาศแบบตั้งพื้น', category: 'เครื่องใช้ไฟฟ้า', keywords: ['ac', 'air', 'แอร์', 'แอร์ตั้งพื้น', 'เครื่องปรับอากาศ', 'ตั้งพื้น'], zone1: 840, zone2: 840, zone3: 840, zone4: 840, zone5: 840, zone6: 1180, zone7: 1010, zone8: 1180, zone9: 1180, zone10: 1180 },
  { id: 11, modelId: 'AC_CABINET', modelName: 'แอร์ตู้', description: 'เครื่องปรับอากาศแบบตู้', category: 'เครื่องใช้ไฟฟ้า', keywords: ['ac', 'air', 'แอร์', 'แอร์ตู้', 'เครื่องปรับอากาศ', 'ตู้'], zone1: 1080, zone2: 1080, zone3: 1080, zone4: 1080, zone5: 1080, zone6: 1510, zone7: 1300, zone8: 1510, zone9: 1510, zone10: 1510 },
  { id: 12, modelId: 'WASHER', modelName: 'เครื่องซักผ้า', description: 'เครื่องซักผ้า (ถังคู่/ฝาบน/ฝาหน้า)', category: 'เครื่องใช้ไฟฟ้า', keywords: ['washer', 'washing', 'เครื่องซักผ้า', 'ซักผ้า', 'เครื่องซัก'], zone1: 720, zone2: 720, zone3: 720, zone4: 720, zone5: 720, zone6: 1010, zone7: 860, zone8: 1010, zone9: 1010, zone10: 1010 },
  { id: 13, modelId: 'FAN_IND', modelName: 'พัดลมอุตสาหกรรม', description: 'พัดลมอุตสาหกรรม', category: 'เครื่องใช้ไฟฟ้า', keywords: ['fan', 'พัดลม', 'อุตสาหกรรม'], zone1: 600, zone2: 600, zone3: 600, zone4: 600, zone5: 600, zone6: 840, zone7: 720, zone8: 840, zone9: 840, zone10: 840 },
  { id: 14, modelId: 'SEWING', modelName: 'จักรเย็บผ้า', description: 'จักรเย็บผ้าอุตสาหกรรม (รวมขาถีบ)', category: 'เครื่องใช้ไฟฟ้า', keywords: ['sewing', 'จักร', 'จักรเย็บผ้า', 'เย็บผ้า'], zone1: 600, zone2: 600, zone3: 600, zone4: 600, zone5: 600, zone6: 840, zone7: 720, zone8: 840, zone9: 840, zone10: 840 },

  // กลุ่มยานพาหนะ
  { id: 15, modelId: 'BICYCLE', modelName: 'จักรยาน', description: 'จักรยาน/รถจักรยานพับได้ใส่กล่อง', category: 'ยานพาหนะ', zone1: 600, zone2: 600, zone3: 600, zone4: 600, zone5: 600, zone6: 840, zone7: 720, zone8: 720, zone9: 720, zone10: 720 },
  { id: 16, modelId: 'EBIKE', modelName: 'จักรยานไฟฟ้า', description: 'รถจักรยานไฟฟ้า/รถจักรยานยนต์ไฟฟ้า', category: 'ยานพาหนะ', zone1: 840, zone2: 840, zone3: 840, zone4: 840, zone5: 840, zone6: 1180, zone7: 1010, zone8: 1010, zone9: 1010, zone10: 1010 },
  { id: 17, modelId: 'MOTO_150', modelName: 'มอเตอร์ไซค์ 150CC', description: 'จักรยานยนต์ขนาดเครื่องยนต์ไม่เกิน 150 CC. ที่มีความกว้างไม่เกิน 820 มม. และไม่ใช่รูปทรง Big Bike', category: 'ยานพาหนะ', zone1: 1200, zone2: 1200, zone3: 1200, zone4: 1200, zone5: 1200, zone6: 1680, zone7: 1440, zone8: 1680, zone9: 1680, zone10: 1680 },
  { id: 18, modelId: 'MOTO_400', modelName: 'มอเตอร์ไซค์ 400CC', description: 'จักรยานยนต์ขนาดเครื่องยนต์เกิน 150 แต่ไม่เกิน 400 CC. ที่มีความกว้างไม่เกิน 820 มม. และไม่ใช่รูปทรง Big Bike', category: 'ยานพาหนะ', zone1: 1500, zone2: 1500, zone3: 1500, zone4: 1500, zone5: 1500, zone6: 2100, zone7: 1800, zone8: 2100, zone9: 2100, zone10: 2100 },
  { id: 19, modelId: 'BIGBIKE', modelName: 'Big Bike', description: 'จักรยานยนต์ขนาดเครื่องยนต์เกิน 400 CC. หรือ จักรยานยนต์ที่มีความกว้างเกิน 820 มม. หรือ มีรูปทรงขนาดใหญ่/Big Bike ทุกขนาด CC.', category: 'ยานพาหนะ', zone1: 3300, zone2: 3300, zone3: 3300, zone4: 3300, zone5: 3300, zone6: 4020, zone7: 3660, zone8: 4020, zone9: 4020, zone10: 4020 },
  { id: 20, modelId: 'TOY_CAR', modelName: 'รถแบตเตอรี่', description: 'รถแบตเตอรี่สำหรับเด็ก/รถสามล้อโยกคนพิการ/วีลแชร์(พับได้)', category: 'ยานพาหนะ', zone1: 300, zone2: 300, zone3: 300, zone4: 300, zone5: 300, zone6: 420, zone7: 360, zone8: 420, zone9: 420, zone10: 420 },

  // กลุ่มเฟอร์นิเจอร์
  { id: 21, modelId: 'CHAIR_1', modelName: 'เก้าอี้ 1 ที่', description: 'เก้าอี้ 1 ที่นั่ง', category: 'เฟอร์นิเจอร์', zone1: 300, zone2: 300, zone3: 300, zone4: 300, zone5: 300, zone6: 420, zone7: 360, zone8: 420, zone9: 420, zone10: 420 },
  { id: 22, modelId: 'SOFA_1', modelName: 'โซฟา 1 ที่', description: 'โซฟา 1 ที่นั่ง', category: 'เฟอร์นิเจอร์', zone1: 480, zone2: 480, zone3: 480, zone4: 480, zone5: 480, zone6: 670, zone7: 580, zone8: 670, zone9: 670, zone10: 670 },
  { id: 23, modelId: 'SOFA_2', modelName: 'โซฟา 2 ที่', description: 'โซฟา 2 ที่นั่ง', category: 'เฟอร์นิเจอร์', zone1: 600, zone2: 600, zone3: 600, zone4: 600, zone5: 600, zone6: 840, zone7: 720, zone8: 840, zone9: 840, zone10: 840 },
  { id: 24, modelId: 'SOFA_3', modelName: 'โซฟา 3 ที่', description: 'โซฟา 3 ที่นั่ง', category: 'เฟอร์นิเจอร์', zone1: 900, zone2: 900, zone3: 900, zone4: 900, zone5: 900, zone6: 1260, zone7: 1080, zone8: 1260, zone9: 1260, zone10: 1260 },
  { id: 25, modelId: 'WARDROBE_1', modelName: 'ตู้เสื้อผ้า 1 บาน', description: 'ตู้เสื้อผ้าประตู 1 บาน', category: 'เฟอร์นิเจอร์', zone1: 1500, zone2: 1500, zone3: 1500, zone4: 1500, zone5: 1500, zone6: 2100, zone7: 1800, zone8: 2100, zone9: 2100, zone10: 2100 },
  { id: 26, modelId: 'WARDROBE_2', modelName: 'ตู้เสื้อผ้า 2 บาน', description: 'ตู้เสื้อผ้าประตู 2 บาน', category: 'เฟอร์นิเจอร์', zone1: 2100, zone2: 2100, zone3: 2100, zone4: 2100, zone5: 2100, zone6: 2940, zone7: 2520, zone8: 2940, zone9: 2940, zone10: 2940 },
  { id: 27, modelId: 'MATTRESS_35', modelName: 'ที่นอน 3.5 ฟุต', description: 'ที่นอน ขนาดไม่เกิน 3.5 ฟุต', category: 'เฟอร์นิเจอร์', zone1: 600, zone2: 600, zone3: 600, zone4: 600, zone5: 600, zone6: 840, zone7: 720, zone8: 840, zone9: 840, zone10: 840 },
  { id: 28, modelId: 'MATTRESS_6', modelName: 'ที่นอน 6 ฟุต', description: 'ที่นอน ขนาดไม่เกิน 6 ฟุต', category: 'เฟอร์นิเจอร์', zone1: 900, zone2: 900, zone3: 900, zone4: 900, zone5: 900, zone6: 1260, zone7: 1080, zone8: 1260, zone9: 1260, zone10: 1260 },
  { id: 29, modelId: 'BED_35', modelName: 'เตียง 3.5 ฟุต', description: 'เตียง ขนาดไม่เกิน 3.5 ฟุต', category: 'เฟอร์นิเจอร์', zone1: 1500, zone2: 1500, zone3: 1500, zone4: 1500, zone5: 1500, zone6: 2100, zone7: 1800, zone8: 2100, zone9: 2100, zone10: 2100 },
  { id: 30, modelId: 'BED_6', modelName: 'เตียง 6 ฟุต', description: 'เตียง ขนาดไม่เกิน 6 ฟุต', category: 'เฟอร์นิเจอร์', zone1: 2100, zone2: 2100, zone3: 2100, zone4: 2100, zone5: 2100, zone6: 2940, zone7: 2520, zone8: 2940, zone9: 2940, zone10: 2940 },

  // กลุ่มเบ็ดเตล็ด
  { id: 31, modelId: 'GYM', modelName: 'เครื่องออกกำลังกาย', description: 'เครื่องออกกำลังกาย ขนาดด้านใดด้านหนึ่งไม่เกิน 150 ซม.', category: 'เบ็ดเตล็ด', zone1: 900, zone2: 900, zone3: 900, zone4: 900, zone5: 900, zone6: 1260, zone7: 1080, zone8: 1260, zone9: 1260, zone10: 1260 },
  { id: 32, modelId: 'PUMP', modelName: 'ปั๊มน้ำ', description: 'เครื่องสูบน้ำ/ปั๊มน้ำ', category: 'เบ็ดเตล็ด', zone1: 420, zone2: 420, zone3: 420, zone4: 420, zone5: 420, zone6: 590, zone7: 500, zone8: 590, zone9: 590, zone10: 590 },
  { id: 33, modelId: 'WHEEL_TIRE', modelName: 'ล้อแม็กพร้อมยาง', description: 'ล้อแม็กพร้อมยาง 1 ล้อ', category: 'เบ็ดเตล็ด', zone1: 420, zone2: 420, zone3: 420, zone4: 420, zone5: 420, zone6: 590, zone7: 500, zone8: 590, zone9: 590, zone10: 590 },
  { id: 34, modelId: 'TIRE', modelName: 'ยางรถยนต์', description: 'ยางรถยนต์นั่งส่วนบุคคล 1 ล้อ', category: 'เบ็ดเตล็ด', zone1: 300, zone2: 300, zone3: 300, zone4: 300, zone5: 300, zone6: 420, zone7: 360, zone8: 420, zone9: 420, zone10: 420 },
  { id: 35, modelId: 'WHEEL', modelName: 'ล้อแม็ก', description: 'ล้อแม็กไม่รวมยาง 1 ล้อ', category: 'เบ็ดเตล็ด', zone1: 300, zone2: 300, zone3: 300, zone4: 300, zone5: 300, zone6: 420, zone7: 360, zone8: 420, zone9: 420, zone10: 420 },
  { id: 36, modelId: 'SPEAKER', modelName: 'ลำโพง', description: 'ลำโพง/ตู้เกมส์คอมพิวเตอร์', category: 'เบ็ดเตล็ด', zone1: 600, zone2: 600, zone3: 600, zone4: 600, zone5: 600, zone6: 840, zone7: 720, zone8: 840, zone9: 840, zone10: 840 },
  { id: 37, modelId: 'COOLER', modelName: 'เครื่องทำน้ำเย็น', description: 'เครื่องทำน้ำเย็นขนาดเล็ก', category: 'เบ็ดเตล็ด', zone1: 420, zone2: 420, zone3: 420, zone4: 420, zone5: 420, zone6: 590, zone7: 500, zone8: 590, zone9: 590, zone10: 590 },
  { id: 38, modelId: 'MOWER', modelName: 'เครื่องตัดหญ้า', description: 'เครื่องตัดหญ้า', category: 'เบ็ดเตล็ด', zone1: 420, zone2: 420, zone3: 420, zone4: 420, zone5: 420, zone6: 590, zone7: 500, zone8: 590, zone9: 590, zone10: 590 },
  { id: 39, modelId: 'DISH_75', modelName: 'จานดาวเทียม 75cm', description: 'จานดาวเทียม ขนาดเส้นผ่าศูนย์กลางไม่เกิน 75 ซม.', category: 'เบ็ดเตล็ด', zone1: 300, zone2: 300, zone3: 300, zone4: 300, zone5: 300, zone6: 420, zone7: 360, zone8: 420, zone9: 420, zone10: 420 },
  { id: 40, modelId: 'DISH_200', modelName: 'จานดาวเทียม 200cm', description: 'จานดาวเทียม ขนาดเส้นผ่าศูนย์กลาง 75-200 ซม.', category: 'เบ็ดเตล็ด', zone1: 480, zone2: 480, zone3: 480, zone4: 480, zone5: 480, zone6: 670, zone7: 580, zone8: 670, zone9: 670, zone10: 670 },
  { id: 41, modelId: 'STOVE_2', modelName: 'เตาแก๊ส 1-2 หัว', description: 'เตาแก๊ส 1 หัว/2 หัว', category: 'เบ็ดเตล็ด', zone1: 200, zone2: 250, zone3: 250, zone4: 250, zone5: 250, zone6: 250, zone7: 250, zone8: 250, zone9: 250, zone10: 250 },
  { id: 42, modelId: 'STOVE_CABINET', modelName: 'เตาแก๊สรวมตู้', description: 'เตาแก๊ส (รวมตู้/ชั้นวาง)', category: 'เบ็ดเตล็ด', zone1: 300, zone2: 300, zone3: 300, zone4: 300, zone5: 300, zone6: 420, zone7: 360, zone8: 420, zone9: 420, zone10: 420 },
  { id: 43, modelId: 'DOOR', modelName: 'บานประตู', description: 'บานประตู 1 บาน ขนาดมาตรฐานไม่เกิน 90X200 ซม.', category: 'เบ็ดเตล็ด', zone1: 420, zone2: 420, zone3: 420, zone4: 420, zone5: 420, zone6: 590, zone7: 500, zone8: 590, zone9: 590, zone10: 590 },
  { id: 44, modelId: 'BUMPER', modelName: 'กันชน', description: 'กันชนรถยนต์ขนาดด้านใดด้านหนึ่งไม่เกิน 200 ซม.', category: 'เบ็ดเตล็ด', zone1: 300, zone2: 300, zone3: 300, zone4: 300, zone5: 300, zone6: 420, zone7: 360, zone8: 420, zone9: 420, zone10: 420 },
  
  // กลุ่มสินค้าขนาดพิเศษ (ฝากส่งระหว่าง ศป.-ศป. เท่านั้น)
  { id: 45, modelId: 'TRIKE_ENGINE', modelName: 'รถสามล้อเครื่อง', description: 'รถสามล้อเครื่อง/สกายแลป/ ATV/จักรยานยนต์พ่วงข้าง (ฝากส่งระหว่าง ศป.-ศป. เท่านั้น)', category: 'ยานพาหนะพิเศษ', zone1: 3600, zone2: 3600, zone3: 3600, zone4: 3600, zone5: 3600, zone6: 4440, zone7: 4020, zone8: 4440, zone9: 4440, zone10: 4440 },
  { id: 46, modelId: 'DISH_250', modelName: 'จานดาวเทียม 250cm', description: 'จานดาวเทียม ขนาดเส้นผ่าศูนย์กลางเกิน 200 ซม. แต่ไม่เกิน 250 ซม. (ฝากส่งระหว่าง ศป.-ศป. เท่านั้น)', category: 'เบ็ดเตล็ดพิเศษ', zone1: 720, zone2: 720, zone3: 720, zone4: 720, zone5: 720, zone6: 1010, zone7: 860, zone8: 1010, zone9: 1010, zone10: 1010 },
  { id: 47, modelId: 'PARAMOTOR', modelName: 'เครื่องพารามอเตอร์', description: 'เครื่องพารามอเตอร์ (ฝากส่งระหว่าง ศป.-ศป. เท่านั้น)', category: 'เบ็ดเตล็ดพิเศษ', zone1: 600, zone2: 600, zone3: 600, zone4: 600, zone5: 600, zone6: 840, zone7: 720, zone8: 840, zone9: 840, zone10: 840 },
];

/**
 * รายการหมวดหมู่สินค้า
 */
export const MODEL_CATEGORIES = [
  'เครื่องใช้ไฟฟ้า',
  'ยานพาหนะ',
  'เฟอร์นิเจอร์',
  'เบ็ดเตล็ด',
  'ยานพาหนะพิเศษ',
  'เบ็ดเตล็ดพิเศษ',
] as const;

export type ModelCategory = typeof MODEL_CATEGORIES[number];
