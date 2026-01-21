/**
 * Fuzzy Search Helper
 * ค้นหาแบบคลุมเครือ รองรับการพิมพ์ผิด
 */

/**
 * คำนวณ Levenshtein Distance
 * วัดความแตกต่างระหว่าง 2 string
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * คำนวณความคล้ายกัน (0-1)
 */
function similarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Fuzzy search - ค้นหาแบบคลุมเครือ
 * @param query - คำค้นหา
 * @param target - ข้อความที่จะเทียบ
 * @param threshold - ค่าความคล้ายขั้นต่ำ (0-1) default 0.6
 */
export function fuzzyMatch(query: string, target: string, threshold: number = 0.6): boolean {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  
  // Exact match
  if (t.includes(q)) return true;
  
  // Fuzzy match
  const score = similarity(q, t);
  return score >= threshold;
}

/**
 * Fuzzy search ในหลายๆ field
 */
export function fuzzySearchMultiple(
  query: string,
  targets: string[],
  threshold: number = 0.6
): boolean {
  return targets.some(target => fuzzyMatch(query, target, threshold));
}

/**
 * คำนวณ score สำหรับ ranking
 */
export function getFuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  
  // Exact match = highest score
  if (t === q) return 1.0;
  
  // Starts with = high score
  if (t.startsWith(q)) return 0.95;
  
  // Contains = medium-high score
  if (t.includes(q)) return 0.85;
  
  // Fuzzy similarity
  return similarity(q, t);
}

/**
 * Thai-specific normalization
 * ปรับ string ภาษาไทยให้เหมาะกับการค้นหา
 */
export function normalizeThaiString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    // Remove tone marks
    .replace(/[่้๊๋]/g, '')
    // Remove vowels above/below
    .replace(/[ั ิ ี ึ ื ุ ู ็]/g, '')
    // Normalize spaces
    .replace(/\s+/g, ' ');
}

/**
 * Smart search - รองรับทั้งภาษาไทยและอังกฤษ
 */
export function smartSearch(query: string, target: string, keywords?: string[]): boolean {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  
  // Empty query
  if (!q) return true;
  
  // Exact match
  if (t.includes(q)) return true;
  
  // Normalized Thai match
  const qNorm = normalizeThaiString(q);
  const tNorm = normalizeThaiString(t);
  if (tNorm.includes(qNorm)) return true;
  
  // Keywords match
  if (keywords) {
    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      if (kw.includes(q) || q.includes(kw)) return true;
      
      // Fuzzy match on keywords
      if (fuzzyMatch(q, kw, 0.7)) return true;
    }
  }
  
  // Fuzzy match as last resort
  return fuzzyMatch(q, t, 0.65);
}
