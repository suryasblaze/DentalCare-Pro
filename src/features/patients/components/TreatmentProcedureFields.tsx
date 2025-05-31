import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Common dental procedures with CDT codes
const PROCEDURES = [
  // Diagnostic
  { value: 'D0120', label: 'D0120 - Periodic Oral Evaluation' },
  { value: 'D0140', label: 'D0140 - Limited Oral Evaluation, Problem Focused' },
  { value: 'D0150', label: 'D0150 - Comprehensive Oral Evaluation' },
  { value: 'D0210', label: 'D0210 - Complete Series of Radiographic Images' },
  { value: 'D0220', label: 'D0220 - Intraoral Periapical First Image' },
  { value: 'D0230', label: 'D0230 - Intraoral Periapical Each Additional Image' },
  { value: 'D0272', label: 'D0272 - Bitewings Two Images' },
  { value: 'D0274', label: 'D0274 - Bitewings Four Images' },
  
  // Preventive
  { value: 'D1110', label: 'D1110 - Prophylaxis Adult' },
  { value: 'D1120', label: 'D1120 - Prophylaxis Child' },
  { value: 'D1206', label: 'D1206 - Topical Fluoride Varnish' },
  { value: 'D1351', label: 'D1351 - Sealant Per Tooth' },
  
  // Restorative
  { value: 'D2140', label: 'D2140 - Amalgam One Surface' },
  { value: 'D2150', label: 'D2150 - Amalgam Two Surfaces' },
  { value: 'D2160', label: 'D2160 - Amalgam Three Surfaces' },
  { value: 'D2161', label: 'D2161 - Amalgam Four or More Surfaces' },
  { value: 'D2330', label: 'D2330 - Resin-Based Composite One Surface, Anterior' },
  { value: 'D2331', label: 'D2331 - Resin-Based Composite Two Surfaces, Anterior' },
  { value: 'D2332', label: 'D2332 - Resin-Based Composite Three Surfaces, Anterior' },
  { value: 'D2335', label: 'D2335 - Resin-Based Composite Four+ Surfaces, Anterior' },
  { value: 'D2391', label: 'D2391 - Resin-Based Composite One Surface, Posterior' },
  { value: 'D2392', label: 'D2392 - Resin-Based Composite Two Surfaces, Posterior' },
  { value: 'D2393', label: 'D2393 - Resin-Based Composite Three Surfaces, Posterior' },
  { value: 'D2394', label: 'D2394 - Resin-Based Composite Four+ Surfaces, Posterior' },
  
  // Crown & Bridge
  { value: 'D2740', label: 'D2740 - Crown Porcelain/Ceramic' },
  { value: 'D2750', label: 'D2750 - Crown Porcelain Fused to High Noble Metal' },
  { value: 'D2751', label: 'D2751 - Crown Porcelain Fused to Base Metal' },
  { value: 'D2752', label: 'D2752 - Crown Porcelain Fused to Noble Metal' },
  
  // Endodontics
  { value: 'D3310', label: 'D3310 - Root Canal Anterior' },
  { value: 'D3320', label: 'D3320 - Root Canal Bicuspid' },
  { value: 'D3330', label: 'D3330 - Root Canal Molar' },
  
  // Periodontics
  { value: 'D4341', label: 'D4341 - Periodontal Scaling & Root Planing, Per Quadrant' },
  { value: 'D4342', label: 'D4342 - Periodontal Scaling & Root Planing, 1-3 Teeth' },
  { value: 'D4910', label: 'D4910 - Periodontal Maintenance' },
  
  // Prosthodontics
  { value: 'D5110', label: 'D5110 - Complete Denture Maxillary' },
  { value: 'D5120', label: 'D5120 - Complete Denture Mandibular' },
  { value: 'D5211', label: 'D5211 - Partial Denture Maxillary' },
  { value: 'D5212', label: 'D5212 - Partial Denture Mandibular' },
  
  // Oral Surgery
  { value: 'D7140', label: 'D7140 - Extraction Erupted Tooth or Exposed Root' },
  { value: 'D7210', label: 'D7210 - Extraction Surgical' },
  { value: 'D7220', label: 'D7220 - Removal of Impacted Tooth Soft Tissue' },
  { value: 'D7230', label: 'D7230 - Removal of Impacted Tooth Partially Bony' },
  { value: 'D7240', label: 'D7240 - Removal of Impacted Tooth Completely Bony' }
];

interface TreatmentProcedureFieldsProps {
  index: number;
  form: UseFormReturn<any>;
  onRemove: () => void;
  selectedTeeth: number[];
}

export function TreatmentProcedureFields({ 
  index, 
  form, 
  onRemove,
  selectedTeeth 
}: TreatmentProcedureFieldsProps) {
  return (
    <div className="space-y-4 p-4 border rounded-md relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`treatment_procedures.${index}.code`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Procedure</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select procedure" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PROCEDURES.map(proc => (
                    <SelectItem key={proc.value} value={proc.value}>
                      {proc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`treatment_procedures.${index}.tooth_number`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tooth Number</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tooth" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {selectedTeeth.map(tooth => (
                    <SelectItem key={tooth} value={tooth.toString()}>
                      Tooth {tooth}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name={`treatment_procedures.${index}.description`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Additional details about the procedure..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`treatment_procedures.${index}.estimated_cost`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Estimated Cost</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                placeholder="0.00"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
} 