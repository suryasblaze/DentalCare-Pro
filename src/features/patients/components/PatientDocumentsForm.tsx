import React, { useState } from 'react';
import { z } from "zod";
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

// Define the schema for documents info
export const documentsSchema = z.object({
  consent_given: z.boolean().default(false),
  profile_photo: z.instanceof(File).optional().nullable(),
  signature: z.instanceof(File).optional().nullable(),
  id_document: z.instanceof(File).optional().nullable(),
  consent_notes: z.string().optional()
});

export type DocumentsValues = z.infer<typeof documentsSchema>;

export function PatientDocumentsForm() {
  const form = useFormContext();
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Documents & Consent</h3>
        <p className="text-sm text-muted-foreground">
          Upload necessary documents and provide consent for treatment.
        </p>
      </div>

      <FormField
        control={form.control}
        name="profile_photo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Profile Photo</FormLabel>
            <FormControl>
              <FileUpload
                value={field.value}
                onFileChange={field.onChange}
                accept="image/png,image/jpeg,image/jpg"
                maxSize={5}
                uploading={uploading}
                onRemove={() => field.onChange(null)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="signature"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Patient Signature</FormLabel>
            <FormControl>
              <FileUpload
                value={field.value}
                onFileChange={field.onChange}
                accept="image/png,image/jpeg,image/jpg"
                maxSize={2}
                uploading={uploading}
                onRemove={() => field.onChange(null)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="id_document"
        render={({ field }) => (
          <FormItem>
            <FormLabel>ID Document</FormLabel>
            <FormControl>
              <FileUpload
                value={field.value}
                onFileChange={field.onChange}
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                maxSize={10}
                uploading={uploading}
                onRemove={() => field.onChange(null)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="consent_given"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>
                I consent to treatment
              </FormLabel>
              <p className="text-sm text-muted-foreground">
                By checking this box, I provide consent for dental treatment and procedures.
              </p>
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="consent_notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Consent Notes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Any additional notes related to patient consent"
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