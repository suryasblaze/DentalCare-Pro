// update_doctor_hours.mjs
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

// Import the compiled JavaScript file
import { supabase } from './dist/app/src/lib/supabase.js';

const doctorIds = [
  '9ae1240e-b800-4f0d-8c9f-117a5db98723',
  '40245a3a-8541-4543-a51d-cb1f222631f7'
];

const saturdaySchedule = { day: 'saturday', start: '10:00', end: '18:00', is_open: true };
const sundaySchedule = { day: 'sunday', start: '10:00', end: '14:00', is_open: true };

async function updateWorkingHours() {
  console.log(`Fetching doctors: ${doctorIds.join(', ')}`);
  const { data: doctors, error: fetchError } = await supabase
    .from('staff')
    .select('id, working_hours')
    .in('id', doctorIds);

  if (fetchError) {
    console.error('Error fetching doctors:', fetchError);
    return;
  }

  if (!doctors || doctors.length === 0) {
    console.log('No doctors found with the specified IDs.');
    return;
  }

  console.log(`Found ${doctors.length} doctors. Processing updates...`);

  for (const doctor of doctors) {
    let currentHours = [];
    try {
      // Handle both JSON string and potential object/array types
      if (typeof doctor.working_hours === 'string') {
        currentHours = JSON.parse(doctor.working_hours || '[]');
      } else if (Array.isArray(doctor.working_hours)) {
        currentHours = doctor.working_hours;
      } else {
         console.log(`Doctor ${doctor.id} has invalid working_hours format, initializing as empty array.`);
         currentHours = []; // Initialize if format is unexpected
      }

      if (!Array.isArray(currentHours)) {
         console.log(`Doctor ${doctor.id} working_hours parsed to non-array, initializing as empty array.`);
         currentHours = []; // Ensure it's an array
      }

    } catch (parseError) {
      console.error(`Error parsing working_hours for doctor ${doctor.id}:`, parseError);
      console.log(`Initializing working hours for doctor ${doctor.id} as empty array.`);
      currentHours = []; // Initialize if parsing fails
    }

    // Ensure it's an array after parsing/initialization
    if (!Array.isArray(currentHours)) {
        console.error(`Doctor ${doctor.id} working_hours is still not an array after processing. Skipping update.`);
        continue; // Skip this doctor if it's still not an array
    }


    let updated = false;

    // Add/Update Saturday
    const satIndex = currentHours.findIndex(h => typeof h?.day === 'string' && h.day.trim().toLowerCase() === 'saturday');
    if (satIndex === -1) {
      currentHours.push(saturdaySchedule);
      updated = true;
      console.log(`Added Saturday schedule for doctor ${doctor.id}`);
    } else if (JSON.stringify(currentHours[satIndex]) !== JSON.stringify(saturdaySchedule)) {
       currentHours[satIndex] = saturdaySchedule;
       updated = true;
       console.log(`Updated Saturday schedule for doctor ${doctor.id}`);
    }

    // Add/Update Sunday
    const sunIndex = currentHours.findIndex(h => typeof h?.day === 'string' && h.day.trim().toLowerCase() === 'sunday');
    if (sunIndex === -1) {
      currentHours.push(sundaySchedule);
      updated = true;
      console.log(`Added Sunday schedule for doctor ${doctor.id}`);
    } else if (JSON.stringify(currentHours[sunIndex]) !== JSON.stringify(sundaySchedule)) {
       currentHours[sunIndex] = sundaySchedule;
       updated = true;
       console.log(`Updated Sunday schedule for doctor ${doctor.id}`);
    }


    if (updated) {
      console.log(`Updating working_hours for doctor ${doctor.id}...`);
      const { error: updateError } = await supabase
        .from('staff')
        .update({ working_hours: currentHours }) // Update with the array/object directly
        .eq('id', doctor.id);

      if (updateError) {
        console.error(`Error updating doctor ${doctor.id}:`, updateError);
      } else {
        console.log(`Successfully updated doctor ${doctor.id}`);
      }
    } else {
       console.log(`No updates needed for doctor ${doctor.id}`);
    }
  }
  console.log('Finished processing doctor working hours.');
}

updateWorkingHours();
