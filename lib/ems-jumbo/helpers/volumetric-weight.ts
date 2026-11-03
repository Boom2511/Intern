/**
 * Volumetric Weight Calculator
 * คำนวณน้ำหนักปริมาตร (Volumetric Weight)
 */

/**
 * คำนวณน้ำหนักปริมาตร
 * สูตร: (กว้าง × ยาว × สูง) / 6000
 * 
 * @param width - ความกว้าง (เซนติเมตร)
 * @param length - ความยาว (เซนติเมตร)
 * @param height - ความสูง (เซนติเมตร)
 * @returns น้ำหนักปริมาตร (กิโลกรัม)
 */
export function calculateVolumetricWeight(
  width: number,
  length: number,
  height: number
): number {
  if (width <= 0 || length <= 0 || height <= 0) {
    throw new Error('ขนาดต้องมากกว่า 0');
  }

  const volumetricWeight = (width * length * height) / 6000;
  
  // ปัดเศษทศนิยม 2 ตำแหน่ง
  return Math.round(volumetricWeight * 100) / 100;
}
