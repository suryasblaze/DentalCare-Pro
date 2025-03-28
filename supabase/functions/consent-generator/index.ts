import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ConsentRequest {
  treatmentPlanId: string;
  patientId: string;
  language?: string;
}

interface ConsentDocument {
  title: string;
  patientName: string;
  dentistName: string;
  procedureDetails: string;
  risks: string[];
  benefits: string[];
  alternatives: string[];
  questions: string[];
  disclaimers: string[];
  signatureFields: {
    patient: boolean;
    guardian: boolean;
    witness: boolean;
    dentist: boolean;
  };
  createdAt: string;
  expiresAt: string;
  version: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { treatmentPlanId, patientId, language = 'en' }: ConsentRequest = await req.json();

    if (!treatmentPlanId || !patientId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    // Fetch treatment plan and patient data
    const [treatmentPlanResult, patientResult, aiPlanResult] = await Promise.all([
      supabase
        .from('treatment_plans')
        .select('*, treatments(*)')
        .eq('id', treatmentPlanId)
        .single(),
        
      supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single(),
        
      supabase
        .from('ai_treatment_plans')
        .select('*')
        .eq('treatment_plan_id', treatmentPlanId)
        .maybeSingle()
    ]);

    if (treatmentPlanResult.error) {
      return new Response(
        JSON.stringify({ error: `Treatment plan not found: ${treatmentPlanResult.error.message}` }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    if (patientResult.error) {
      return new Response(
        JSON.stringify({ error: `Patient not found: ${patientResult.error.message}` }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }

    const treatmentPlan = treatmentPlanResult.data;
    const patient = patientResult.data;
    const aiPlan = aiPlanResult.data;

    // Generate consent content
    const consentDocument = await generateConsentDocument(
      treatmentPlan,
      patient,
      aiPlan,
      language
    );

    // Check if a consent document already exists
    const { data: existingConsent } = await supabase
      .from('treatment_consents')
      .select('id')
      .eq('treatment_plan_id', treatmentPlanId)
      .eq('patient_id', patientId)
      .maybeSingle();

    let consentId;
    if (existingConsent) {
      // Update existing consent
      const { data, error } = await supabase
        .from('treatment_consents')
        .update({
          consent_document: consentDocument,
          status: 'pending', // Reset status since content changed
          signed_at: null,
          signature_url: null,
          witness_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConsent.id)
        .select()
        .single();

      if (error) throw error;
      consentId = data.id;
    } else {
      // Create new consent
      const { data, error } = await supabase
        .from('treatment_consents')
        .insert([{
          treatment_plan_id: treatmentPlanId,
          patient_id: patientId,
          consent_document: consentDocument,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      consentId = data.id;
    }

    // Update treatment plan to indicate consent is required
    await supabase
      .from('treatment_plans')
      .update({
        consent_required: true,
        consent_status: 'pending'
      })
      .eq('id', treatmentPlanId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        consentId,
        consentDocument 
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
});

async function generateConsentDocument(
  treatmentPlan: any,
  patient: any,
  aiPlan: any | null,
  language: string
): Promise<ConsentDocument> {
  const patientName = `${patient.first_name} ${patient.middle_name || ''} ${patient.last_name}`.replace(/\s+/g, ' ').trim();
  const dentistName = 'Dr. ' + (treatmentPlan.dentist_name || 'Your Dentist');
  
  // Extract treatments
  const treatments = treatmentPlan.treatments || [];
  
  // Use AI plan if available, otherwise use treatment plan data
  const risks = [];
  const benefits = [];
  const alternatives = [];
  
  if (aiPlan && aiPlan.content) {
    // Extract data from AI-generated plan
    const content = aiPlan.content;
    
    if (content.primaryOption && content.primaryOption.risks) {
      risks.push(...content.primaryOption.risks);
    }
    
    if (content.primaryOption && content.primaryOption.benefits) {
      benefits.push(...content.primaryOption.benefits);
    }
    
    if (content.alternativeOptions) {
      content.alternativeOptions.forEach((option: any) => {
        alternatives.push(`${option.type}: ${option.description}`);
      });
    }
    
    if (content.consentRequirements && content.consentRequirements.risks) {
      risks.push(...content.consentRequirements.risks.filter((risk: string) => !risks.includes(risk)));
    }
  }
  
  // Add basic risks if none were provided
  if (risks.length === 0) {
    risks.push(
      "Temporary or permanent numbness or altered sensation",
      "Post-treatment discomfort or pain",
      "Infection requiring additional treatment",
      "Allergic reaction to materials or medications",
      "Need for additional procedures"
    );
  }
  
  // Add basic benefits if none were provided
  if (benefits.length === 0) {
    benefits.push(
      "Relief from dental pain or discomfort",
      "Improved oral function",
      "Prevention of further dental problems",
      "Improved appearance",
      "Better overall oral health"
    );
  }
  
  // Add basic alternatives if none were provided
  if (alternatives.length === 0) {
    alternatives.push(
      "No treatment (with possible consequences)",
      "Delayed treatment (with possible consequences)",
      "Alternative procedures that may be less effective"
    );
  }
  
  // Create procedure details from treatments
  let procedureDetails = treatmentPlan.description || '';
  
  if (treatments.length > 0) {
    procedureDetails += '\n\nSpecific Procedures:\n';
    treatments.forEach((treatment: any, index: number) => {
      procedureDetails += `${index + 1}. ${treatment.type}: ${treatment.description}\n`;
    });
  }
  
  // Create consent document
  const consentDocument: ConsentDocument = {
    title: `Informed Consent for Dental Treatment: ${treatmentPlan.title}`,
    patientName,
    dentistName,
    procedureDetails,
    risks,
    benefits,
    alternatives,
    questions: [
      "What is the timeline for the recommended treatment?",
      "What will happen if I decide not to proceed with the recommended treatment?",
      "Are there any lifestyle changes I should make before or after treatment?",
      "What follow-up procedures might be necessary after this treatment?",
      "What costs are involved, and what portion might be covered by insurance?"
    ],
    disclaimers: [
      "I understand that dentistry is not an exact science and results cannot be guaranteed.",
      "I acknowledge that no guarantees have been made to me concerning the results of the procedures.",
      "I have been provided an opportunity to ask questions, and all my questions have been answered satisfactorily.",
      "I understand that I may withdraw my consent at any time before the start of treatment.",
      "I confirm that I have read and fully understand this consent form."
    ],
    signatureFields: {
      patient: true,
      guardian: patient.age < 18,
      witness: true,
      dentist: true
    },
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    version: "1.0"
  };
  
  // Adapt content based on language (simplified example)
  if (language === 'es') {
    // Spanish translation would go here
    consentDocument.title = `Consentimiento Informado para Tratamiento Dental: ${treatmentPlan.title}`;
    // ...translate other fields
  }
  
  return consentDocument;
}