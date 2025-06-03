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

// Common medication frequencies
const FREQUENCIES = [
  { value: 'qd', label: 'Once daily (QD)' },
  { value: 'bid', label: 'Twice daily (BID)' },
  { value: 'tid', label: 'Three times daily (TID)' },
  { value: 'qid', label: 'Four times daily (QID)' },
  { value: 'q4h', label: 'Every 4 hours (Q4H)' },
  { value: 'q6h', label: 'Every 6 hours (Q6H)' },
  { value: 'q8h', label: 'Every 8 hours (Q8H)' },
  { value: 'q12h', label: 'Every 12 hours (Q12H)' },
  { value: 'prn', label: 'As needed (PRN)' },
];

// Common dental medications
const MEDICATIONS = [
  { value: 'amoxicillin_500', label: 'Amoxicillin 500mg' },
  { value: 'amoxicillin_875', label: 'Amoxicillin 875mg' },
  { value: 'clindamycin_300', label: 'Clindamycin 300mg' },
  { value: 'metronidazole_500', label: 'Metronidazole 500mg' },
  { value: 'ibuprofen_400', label: 'Ibuprofen 400mg' },
  { value: 'ibuprofen_600', label: 'Ibuprofen 600mg' },
  { value: 'acetaminophen_500', label: 'Acetaminophen 500mg' },
  { value: 'chlorhexidine_0.12', label: 'Chlorhexidine 0.12% Mouthwash' },
];

// Common durations
const DURATIONS = [
  { value: '3d', label: '3 days' },
  { value: '5d', label: '5 days' },
  { value: '7d', label: '7 days' },
  { value: '10d', label: '10 days' },
  { value: '14d', label: '14 days' },
  { value: '21d', label: '21 days' },
  { value: '28d', label: '28 days' },
  { value: '30d', label: '30 days' },
];

interface PrescriptionFieldsProps {
  index: number;
  form: UseFormReturn<any>;
  onRemove: () => void;
}

export function PrescriptionFields({ index, form, onRemove }: PrescriptionFieldsProps) {
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
          name={`prescriptions.${index}.medication`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medication</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select medication" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MEDICATIONS.map(med => (
                    <SelectItem key={med.value} value={med.value}>
                      {med.label}
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
          name={`prescriptions.${index}.dosage`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dosage</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 1 tablet" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`prescriptions.${index}.frequency`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FREQUENCIES.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
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
          name={`prescriptions.${index}.duration`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DURATIONS.map(dur => (
                    <SelectItem key={dur.value} value={dur.value}>
                      {dur.label}
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
        name={`prescriptions.${index}.special_instructions`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Special Instructions</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Special instructions for this prescription (e.g., take with food)"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
} 