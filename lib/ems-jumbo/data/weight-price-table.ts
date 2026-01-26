/**
 * EMS Jumbo Weight-Based Pricing Table
 * ตารางราคาตามน้ำหนักและ Zone (จากเอกสาร EMS Jumbo Official)
 */

export interface WeightPriceEntry {
  minWeight: number;
  maxWeight: number;
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
 * ตารางราคา EMS Jumbo ตามน้ำหนัก (กิโลกรัม)
 * ข้อมูลจากเอกสาร: การทดลองให้บริการ EMS JUMBO (Weight.html)
 * 
 * การตีความ: ตัวเลขในแถว (เช่น "50") หมายถึงช่วงน้ำหนัก 50-59 kg
 * - แถว "20" = น้ำหนัก 20-29 kg
 * - แถว "50" = น้ำหนัก 50-59 kg
 * - แถว "60" = น้ำหนัก 60-69 kg
 */
export const EMS_WEIGHT_PRICE_TABLE: WeightPriceEntry[] = [
  { minWeight: 0, maxWeight: 20, zone1: 200, zone2: 250, zone3: 250, zone4: 250, zone5: 250, zone6: 250, zone7: 250, zone8: 250, zone9: 250, zone10: 250 },
  { minWeight: 20, maxWeight: 30, zone1: 200, zone2: 250, zone3: 250, zone4: 250, zone5: 250, zone6: 250, zone7: 250, zone8: 250, zone9: 250, zone10: 250 },
  { minWeight: 30, maxWeight: 40, zone1: 200, zone2: 250, zone3: 250, zone4: 250, zone5: 250, zone6: 270, zone7: 250, zone8: 270, zone9: 270, zone10: 270 },
  { minWeight: 40, maxWeight: 50, zone1: 240, zone2: 250, zone3: 280, zone4: 280, zone5: 280, zone6: 360, zone7: 320, zone8: 360, zone9: 360, zone10: 360 },
  { minWeight: 50, maxWeight: 60, zone1: 300, zone2: 300, zone3: 350, zone4: 350, zone5: 350, zone6: 450, zone7: 400, zone8: 450, zone9: 450, zone10: 450 },
  { minWeight: 60, maxWeight: 70, zone1: 360, zone2: 360, zone3: 420, zone4: 420, zone5: 420, zone6: 540, zone7: 480, zone8: 540, zone9: 540, zone10: 540 },
  { minWeight: 70, maxWeight: 80, zone1: 420, zone2: 420, zone3: 490, zone4: 490, zone5: 490, zone6: 630, zone7: 560, zone8: 630, zone9: 630, zone10: 630 },
  { minWeight: 80, maxWeight: 90, zone1: 480, zone2: 480, zone3: 560, zone4: 560, zone5: 560, zone6: 720, zone7: 640, zone8: 720, zone9: 720, zone10: 720 },
  { minWeight: 90, maxWeight: 100, zone1: 540, zone2: 540, zone3: 630, zone4: 630, zone5: 630, zone6: 810, zone7: 720, zone8: 810, zone9: 810, zone10: 810 },
  { minWeight: 100, maxWeight: 110, zone1: 600, zone2: 600, zone3: 700, zone4: 700, zone5: 700, zone6: 900, zone7: 800, zone8: 900, zone9: 900, zone10: 900 },
  { minWeight: 110, maxWeight: 120, zone1: 660, zone2: 660, zone3: 770, zone4: 770, zone5: 770, zone6: 990, zone7: 880, zone8: 990, zone9: 990, zone10: 990 },
  { minWeight: 120, maxWeight: 130, zone1: 720, zone2: 720, zone3: 840, zone4: 840, zone5: 840, zone6: 1080, zone7: 960, zone8: 1080, zone9: 1080, zone10: 1080 },
  { minWeight: 130, maxWeight: 140, zone1: 780, zone2: 780, zone3: 910, zone4: 910, zone5: 910, zone6: 1170, zone7: 1040, zone8: 1170, zone9: 1170, zone10: 1170 },
  { minWeight: 140, maxWeight: 150, zone1: 840, zone2: 840, zone3: 980, zone4: 980, zone5: 980, zone6: 1260, zone7: 1120, zone8: 1260, zone9: 1260, zone10: 1260 },
  { minWeight: 150, maxWeight: 160, zone1: 900, zone2: 900, zone3: 1050, zone4: 1050, zone5: 1050, zone6: 1350, zone7: 1200, zone8: 1350, zone9: 1350, zone10: 1350 },
  { minWeight: 160, maxWeight: 170, zone1: 960, zone2: 960, zone3: 1120, zone4: 1120, zone5: 1120, zone6: 1440, zone7: 1280, zone8: 1440, zone9: 1440, zone10: 1440 },
  { minWeight: 170, maxWeight: 180, zone1: 1020, zone2: 1020, zone3: 1190, zone4: 1190, zone5: 1190, zone6: 1530, zone7: 1360, zone8: 1530, zone9: 1530, zone10: 1530 },
  { minWeight: 180, maxWeight: 190, zone1: 1080, zone2: 1080, zone3: 1260, zone4: 1260, zone5: 1260, zone6: 1620, zone7: 1440, zone8: 1620, zone9: 1620, zone10: 1620 },
  { minWeight: 190, maxWeight: 200, zone1: 1140, zone2: 1140, zone3: 1330, zone4: 1330, zone5: 1330, zone6: 1710, zone7: 1520, zone8: 1710, zone9: 1710, zone10: 1710 },
  { minWeight: 200, maxWeight: 999, zone1: 1200, zone2: 1200, zone3: 1400, zone4: 1400, zone5: 1400, zone6: 1800, zone7: 1600, zone8: 1800, zone9: 1800, zone10: 1800 },
];
