/**
 * EMS Jumbo Calculator - Floating Panel
 * Floating panel สำหรับคำนวณราคา EMS Jumbo
 */

'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CardFooter } from '@/components/ui/card';
import { useDebounce } from '@/hooks/useDebounce';
import { X, Package, Calculator, Info, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  calculateEMSJumboTotal,
  EMS_MODEL_PRICE_TABLE_FULL,
  getZoneByProvince,
  getProvinceFromZipcode,
  getLocationFromZipcode,
  isValidZipcode,
  smartSearch,
  PROVINCE_ZONE_MAPPING,
  type EMSJumboInput,
  type EMSJumboResult
} from '@/lib/ems-jumbo';
import { calculateTotalWithServices } from '@/lib/ems-jumbo/helpers/pickup-delivery-fee';
import { calculateTotalWithInsurance, MAX_INSURANCE_COVERAGE } from '@/lib/ems-jumbo/helpers/insurance-fee';

type CalculationMode = 'model' | 'weight';

interface EMSJumboCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: CalculationMode;
}

export function EMSJumboCalculator({ isOpen, onClose, initialMode = 'weight' }: EMSJumboCalculatorProps) {
  const [mode, setMode] = useState<CalculationMode>(initialMode);
  const [result, setResult] = useState<EMSJumboResult | null>(null);
  const [error, setError] = useState<string>('');

  // Form state
  const [modelId, setModelId] = useState('');
  const [actualWeight, setActualWeight] = useState('');
  const [size, setSize] = useState({
    width: '',
    length: '',
    height: '',
  });
  const [destinationInput, setDestinationInput] = useState<string>('');
  const [province, setProvince] = useState<string>('');
  const [zone, setZone] = useState<number>(1);
  const [pickupService, setPickupService] = useState(false); // รับฝาก
  const [deliveryService, setDeliveryService] = useState(false); // นำจ่าย
  const [insuranceAmount, setInsuranceAmount] = useState(''); // วงเงินรับประกัน

  // Calculate volumetric weight (cm³ / 6000)
  const calculateVolumetricWeight = useMemo(() => {
    const w = parseFloat(size.width) || 0;
    const l = parseFloat(size.length) || 0;
    const h = parseFloat(size.height) || 0;

    if (w > 0 && l > 0 && h > 0) {
      const volumetricKg = (w * l * h) / 6000;
      return volumetricKg.toFixed(2);
    }
    return '0';
  }, [size.width, size.length, size.height]);

  // Prepare model options for Combobox (memoized)
  const modelOptions: ComboboxOption[] = useMemo(() =>
    EMS_MODEL_PRICE_TABLE_FULL.map(model => ({
      value: model.modelId,
      label: model.modelName,
      description: model.description.length > 60 ? `${model.description.substring(0, 60)}...` : model.description,
      category: model.category,
      keywords: model.keywords || [],
    })),
    []);

  // Prepare province options for Combobox (memoized)
  const provinceOptions: ComboboxOption[] = useMemo(() =>
    PROVINCE_ZONE_MAPPING.map(mapping => ({
      value: mapping.province,
      label: mapping.province,
      description: `Zone ${mapping.zone}`,
      keywords: mapping.zipCodePrefix || [],
    })),
    []);

  // Dynamic search for zipcode (3+ digits) - use same logic as useEffect (memoized)
  const handleZipcodeSearch = useCallback((search: string): ComboboxOption[] => {
    // If 3+ digits, try to get location
    if (/^\d{3,}$/.test(search)) {
      // If exactly 5 digits, use getLocationFromZipcode (same logic as useEffect line 78-79)
      if (search.length === 5) {
        const location = getLocationFromZipcode(search);
        if (location) {
          return [{
            value: location.province,
            label: location.province,
            description: `Zone ${location.zone}`,
            keywords: [],
          }];
        }
      } else {
        // For partial zipcode (3-4 digits), find all provinces that have zipcodes starting with search
        const matchingProvinces = new Set<string>();

        // Search through all provinces to find those with matching zipcode prefixes
        PROVINCE_ZONE_MAPPING.forEach(mapping => {
          // Check if any zipcode prefix matches
          const hasMatch = mapping.zipCodePrefix?.some(prefix =>
            search.startsWith(prefix)
          );

          if (hasMatch) {
            matchingProvinces.add(mapping.province);
          }
        });

        // Convert to options
        return Array.from(matchingProvinces).map(provinceName => {
          const mapping = PROVINCE_ZONE_MAPPING.find(m => m.province === provinceName);
          return {
            value: provinceName,
            label: provinceName,
            description: `Zone ${mapping?.zone || 1}`,
            keywords: [],
          };
        });
      }
    }

    return [];
  }, []);

  // Handle destination input (province name or zipcode)
  useEffect(() => {
    if (!destinationInput) {
      setProvince('');
      setZone(1);
      return;
    }

    const input = destinationInput.trim();

    // Check if it's a zipcode (5 digits)
    if (/^\d{5}$/.test(input)) {
      const location = getLocationFromZipcode(input);
      if (location) {
        setProvince(location.province);
        setZone(location.zone);
      } else {
        setProvince('');
      }
    } else {
      // It's a province name - try to find it
      const foundMapping = PROVINCE_ZONE_MAPPING.find(m => m.province === input);
      if (foundMapping) {
        setProvince(foundMapping.province);
        setZone(foundMapping.zone);
      } else {
        // Try partial match
        const partialMatch = PROVINCE_ZONE_MAPPING.find(m =>
          m.province.includes(input) || input.includes(m.province)
        );
        if (partialMatch) {
          setProvince(partialMatch.province);
          setZone(partialMatch.zone);
        }
      }
    }
  }, [destinationInput]);

  // Reset form when mode changes
  useEffect(() => {
    setResult(null);
    setError('');
  }, [mode]);

  // Debounce inputs to prevent excessive calculations
  const debouncedInputs = useDebounce({
    mode,
    modelId,
    actualWeight,
    width: size.width,
    length: size.length,
    height: size.height,
    province,
    zone,
    pickupService,
    deliveryService,
    insuranceAmount
  }, 400);

  // Auto-calculate when debounced inputs change
  useEffect(() => {
    if (debouncedInputs.mode === 'model' && debouncedInputs.modelId && debouncedInputs.province && debouncedInputs.zone) {
      handleCalculate();
    } else if (debouncedInputs.mode === 'weight' && debouncedInputs.actualWeight && debouncedInputs.width && debouncedInputs.length && debouncedInputs.height && debouncedInputs.province && debouncedInputs.zone) {
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInputs]);

  const handleCalculate = () => {
    try {
      setError('');

      // Check province first
      if (!province) {
        setError('กรุณาเลือกจังหวัดปลายทาง');
        return;
      }

      let input: EMSJumboInput;

      if (mode === 'model') {
        if (!modelId) {
          setError('กรุณาเลือก Model');
          return;
        }

        input = {
          mode: 'model',
          modelId,
          zone,
        };
      } else {
        if (!actualWeight || !size.width || !size.length || !size.height) {
          setError('กรุณากรอกข้อมูลให้ครบถ้วน');
          return;
        }

        input = {
          mode: 'weight',
          actualWeight: parseFloat(actualWeight), // Weight in kg
          width: parseFloat(size.width),
          length: parseFloat(size.length),
          height: parseFloat(size.height),
          zone,
        };
      }

      const calculationResult = calculateEMSJumboTotal(input);

      // Add model name if model mode
      if (mode === 'model' && modelId) {
        const model = EMS_MODEL_PRICE_TABLE_FULL.find(m => m.modelId === modelId);
        if (model) {
          calculationResult.details.modelName = model.modelName;
        }
      }

      // Calculate pickup/delivery fees
      // Use basePrice (without surcharge) as the base for pickup/delivery calculation
      const baseFee = calculationResult.basePrice;
      const serviceResult = calculateTotalWithServices(baseFee, pickupService, deliveryService);

      // Calculate insurance fee
      const insurance = insuranceAmount ? parseFloat(insuranceAmount) : 0;
      const insuranceResult = calculateTotalWithInsurance(serviceResult.total, insurance);

      // Update result with all service fees
      // Total = basePrice + surcharge + pickup + delivery + insurance
      calculationResult.totalPrice = calculationResult.basePrice + calculationResult.surcharge + serviceResult.pickupFee + serviceResult.deliveryFee + insuranceResult.insuranceFee;
      calculationResult.details.pickupFee = serviceResult.pickupFee;
      calculationResult.details.deliveryFee = serviceResult.deliveryFee;
      calculationResult.details.baseFee = calculationResult.basePrice; // Store the actual base price (without surcharge)
      calculationResult.details.insuranceFee = insuranceResult.insuranceFee;
      calculationResult.details.insuranceAmount = insuranceResult.insuranceAmount;

      setResult(calculationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการคำนวณ');
      setResult(null);
    }
  };

  const handleReset = () => {
    setModelId('');
    setActualWeight('');
    setSize({ width: '', length: '', height: '' });
    setDestinationInput('');
    setProvince('');
    setZone(1);
    setPickupService(false);
    setDeliveryService(false);
    setInsuranceAmount('');
    setResult(null);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
            <Package className="w-6 h-6" />
            EMS Jumbo Calculator
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="overflow-y-auto overscroll-contain p-6 space-y-8 scroll-smooth">

          {/* STEP 1: ประเภทการคำนวณ */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="rounded-full w-6 h-6 p-0 flex items-center justify-center">1</Badge>
              <Label className="font-bold text-base">เลือกรูปแบบสิ่งของ</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={mode === 'model' ? 'default' : 'outline'}
                onClick={() => setMode('model')}
                className={cn("h-12 border-2", mode === 'model' && "border-primary")}
              >
                <Package className="w-4 h-4 mr-2" />
                สินค้าสำเร็จรูป
              </Button>
              <Button
                variant={mode === 'weight' ? 'default' : 'outline'}
                onClick={() => setMode('weight')}
                className={cn("h-12 border-2", mode === 'weight' && "border-primary")}
              >
                <Calculator className="w-4 h-4 mr-2" />
                น้ำหนัก/ขนาด
              </Button>
            </div>
          </section>

          {/* STEP 2: ปลายทาง */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="rounded-full w-6 h-6 p-0 flex items-center justify-center">2</Badge>
              <Label className="font-bold text-base">จุดหมายปลายทาง</Label>
            </div>
            <div className="relative">
              <Combobox
                options={provinceOptions}
                value={destinationInput}
                onValueChange={setDestinationInput}
                onSearch={handleZipcodeSearch}
                allowFreeInput
                placeholder="ระบุจังหวัด หรือ รหัสไปรษณีย์ 5 หลัก"
                className={cn("h-11 text-sm", province)}
              />
              {province && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2 px-2 bg-green-100 text-green-700 rounded text-xs font-bold py-1">
                  ZONE {zone}
                </div>
              )}
            </div>
          </section>

          {/* STEP 3: รายละเอียดสิ่งของ */}
          <section className="space-y-4 pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="rounded-full w-6 h-6 p-0 flex items-center justify-center">3</Badge>
              <Label className="font-bold text-base">รายละเอียดสิ่งของ</Label>
            </div>

            {mode === 'model' ? (
              <Combobox
                options={modelOptions}
                value={modelId}
                onValueChange={setModelId}
                placeholder="ค้นหาสินค้า เช่น ทีวี ตู้เย็น มอเตอร์ไซค์"
                className="h-11 text-sm"
              />
            ) : (
              <div className="grid gap-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="actualWeight" className="text-xs font-medium">น้ำหนักรวม (กิโลกรัม)</Label>
                  <Input
                    id="actualWeight"
                    type="text"
                    inputMode="decimal"
                    value={actualWeight}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow numbers and decimal point only
                      if (value === '' || /^[0-9.]*$/.test(value)) {
                        // Prevent multiple decimal points
                        if ((value.match(/\./g) || []).length <= 1) {
                          setActualWeight(value);
                        }
                      }
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0"
                    className="h-11 font-mono text-sm tabular-nums "
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">กว้าง (ซม.)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={size.width}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^[0-9.]*$/.test(value)) {
                          if ((value.match(/\./g) || []).length <= 1) {
                            setSize(prev => ({ ...prev, width: value }));
                          }
                        }
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                      className="h-11 font-mono text-sm tabular-nums "
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">ยาว (ซม.)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={size.length}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^[0-9.]*$/.test(value)) {
                          if ((value.match(/\./g) || []).length <= 1) {
                            setSize(prev => ({ ...prev, length: value }));
                          }
                        }
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                      className="h-11 font-mono text-sm tabular-nums "
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">สูง (ซม.)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={size.height}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^[0-9.]*$/.test(value)) {
                          if ((value.match(/\./g) || []).length <= 1) {
                            setSize(prev => ({ ...prev, height: value }));
                          }
                        }
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                      className="h-11 font-mono text-sm tabular-nums "
                    />
                  </div>
                </div>
                {size.width && size.length && size.height && parseFloat(calculateVolumetricWeight) > 0 && (
                  <p className="text-xs text-blue-500 font-medium">
                    น้ำหนักปริมาตร = {calculateVolumetricWeight} กิโลกรัม
                  </p>
                )}
              </div>
            )}
          </section>

          {/* STEP 4: บริการเสริม */}
          <section className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-4">
            <Label className="text-sm font-bold flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-500" />
              บริการเพิ่มเติม (ถ้ามี)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center p-3 bg-white border rounded-lg cursor-pointer hover:border-primary transition-colors">
                <input type="checkbox" checked={pickupService} onChange={(e) => setPickupService(e.target.checked)} className="w-4 h-4 mr-3 accent-primary" />
                <span className="text-sm">รับฝากถึงที่</span>
              </label>
              <label className="flex items-center p-3 bg-white border rounded-lg cursor-pointer hover:border-primary transition-colors">
                <input type="checkbox" checked={deliveryService} onChange={(e) => setDeliveryService(e.target.checked)} className="w-4 h-4 mr-3 accent-primary" />
                <span className="text-sm">นำจ่ายถึงที่</span>
              </label>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                วงเงินรับประกันสินค้า (บาท)
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0 - 200,000"
                value={insuranceAmount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');

                  if (raw === '') {
                    setInsuranceAmount('');
                    return;
                  }

                  const num = Math.min(Number(raw), 200000);
                  setInsuranceAmount(num.toString());
                }}
                onWheel={(e) => e.currentTarget.blur()}
                className="bg-white font-mono text-sm h-11"
              />
            </div>
          </section>

          {/* RESULT AREA */}
          {result && <ResultSummary result={result} zone={zone} />}
        </CardContent>

        <CardFooter className="p-4 border-t bg-slate-50 gap-3">
          <Button variant="outline" onClick={handleReset} className="flex-1 h-11">ล้างข้อมูล</Button>
          <Button onClick={() => { handleReset(); onClose(); }} className="flex-1 h-11 shadow-lg shadow-primary/20">ตกลง</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Helper components (memoized for performance)
const PriceLine = React.memo(({ label, value, color = "text-slate-600" }: { label: string, value: number, color?: string }) => {
  // เช็คค่าต้องมากกว่า 0 เท่านั้นถึงจะแสดง (แก้ปัญหาเลข 0 โผล่)
  if (!value || value <= 0) return null;

  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={cn("font-semibold font-mono text-sm", color)}>
        ฿{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
});
PriceLine.displayName = 'PriceLine';

// 2. ปรับ ResultSummary ให้ Style ล้อไปกับ Form ข้างบน
const ResultSummary = React.memo(
  ({ result, zone }: { result: EMSJumboResult; zone: number }) => {
    return (
      <section className="space-y-4 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="outline"
            className="rounded-full w-6 h-6 p-0 flex items-center justify-center"
          >
            4
          </Badge>
          <Label className="font-bold text-base text-slate-800">
            สรุปค่าบริการประมาณการ
          </Label>
        </div>

        {/* Card */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Description / Destination */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Description
                </p>
                <p className="text-sm font-medium text-slate-700">
                  {result.details.modelName || "คำนวณตามน้ำหนัก/ขนาด"}
                </p>
              </div>

              <div className="text-right space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Destination
                </p>
                <p className="text-sm font-medium text-slate-700">
                  Zone {zone}
                </p>
              </div>
            </div>

            {/* Price Lines */}
            <div className="divide-y divide-slate-100">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">
                  ค่าบริการหลัก (Base Tariff)
                </span>
                <span className="font-mono tabular-nums font-semibold text-sm">
                  ฿
                  {(result.details.baseFee || result.basePrice).toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2 }
                  )}
                </span>
              </div>

              <PriceLine
                label="ค่าบริการส่วนเกินขนาด (Surcharge)"
                value={result.surcharge}
              />
              <PriceLine
                label="บริการรับฝาก ณ ที่อยู่ (Pickup Service)"
                value={result.details.pickupFee || 0}
              />
              <PriceLine
                label="บริการนำจ่าย ณ ที่อยู่ (Delivery Service)"
                value={result.details.deliveryFee || 0}
              />

              {(result.details.insuranceFee ?? 0) > 0 && (
                <div className="flex justify-between items-center py-2 border-t border-slate-100">
                  <span className="text-sm text-slate-500">ค่าประกันสินค้า (Insurance)</span>
                  <div className="text-right">
                    <span className="font-mono tabular-nums font-semibold text-sm">
                      ฿{result.details.insuranceFee?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[11px] text-blue-500 font-medium italic mt-0.5">
                      *วงเงินคุ้มครอง {result.details.insuranceAmount?.toLocaleString()} บาท
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="mt-2 px-4 py-3 bg-slate-100/60 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">
                  Total Amount
                </p>
                <p className="text-sm font-bold text-slate-800">
                  ยอดชำระสุทธิ
                </p>
              </div>
              <p className="text-2xl font-black text-primary font-mono tabular-nums tracking-tight">
                ฿
                {result.totalPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 italic">
          <Info className="w-3.5 h-3.5" />
          ราคาที่แสดงเป็นราคาประมาณการ ข้อมูลจริงขึ้นอยู่กับการวัด ณ จุดรับฝาก
        </p>
      </section>
    );
  }
);

ResultSummary.displayName = "ResultSummary";