import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface TreatmentRequest {
  patientId: string;
  currentIssue: string;
  medicalHistory: any[];
  previousTreatments: any[];
  assessments: any[];
  diagnosticImages: any[];
  insuranceInfo?: any;
  patientPreferences?: any;
  lifestyleFactors?: any;
}

interface TreatmentOption {
  type: string;
  description: string;
  estimatedCost: number;
  priority: 'high' | 'medium' | 'low';
  risks: string[];
  benefits: string[];
  successRate: number;
  recommendedMaterials: string[];
  timelineEstimate: string;
  followUpPlan: string;
  insuranceCoverage?: {
    estimatedCoveragePercent: number;
    estimatedOutOfPocket: number;
    coverageNotes: string;
  };
}

interface TreatmentPlan {
  title: string;
  description: string;
  summary: string;
  patientFriendlyExplanation: string;
  primaryOption: TreatmentOption;
  alternativeOptions: TreatmentOption[];
  preventiveMeasures: string[];
  precautions: string[];
  expectedOutcome: string;
  consentRequirements: {
    required: boolean;
    details: string[];
    risks: string[];
    alternatives: string[];
  };
  postTreatmentCare: string[];
  followUpSchedule: string[];
  educationalResources: string[];
  patientResponsibilities: string[];
  estimatedTotalCost: number;
  estimatedInsuranceCoverage: number;
  estimatedOutOfPocket: number;
  dataAnalysisSummary: string;
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

    const {
      patientId,
      currentIssue,
      medicalHistory,
      previousTreatments,
      assessments,
      diagnosticImages,
      insuranceInfo,
      patientPreferences,
      lifestyleFactors
    }: TreatmentRequest = await req.json();

    // Get complete patient data
    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError) {
      throw new Error(`Failed to fetch patient data: ${patientError.message}`);
    }

    // Get insurance information if not provided
    if (!insuranceInfo && patientData.insurance_coverage_details) {
      insuranceInfo = patientData.insurance_coverage_details;
    }

    // Get lifestyle factors if not provided
    if (!lifestyleFactors && patientData.lifestyle_habits) {
      lifestyleFactors = patientData.lifestyle_habits;
    }

    // Prepare the prompt for the AI with comprehensive data
    const prompt = `As an advanced dental AI assistant, generate a comprehensive, evidence-based treatment plan for a patient with the following profile:

Patient Profile:
- Age: ${patientData.age || 'Unknown'}
- Gender: ${patientData.gender || 'Unknown'}
- Medical Conditions: ${patientData.medical_conditions ? JSON.stringify(patientData.medical_conditions) : 'None reported'}
- Allergies: ${patientData.allergies ? JSON.stringify(patientData.allergies) : 'None reported'}
- Current Medications: ${patientData.current_medications ? JSON.stringify(patientData.current_medications) : 'None reported'}
- Lifestyle Factors: ${JSON.stringify(lifestyleFactors || {})}
- Blood Group: ${patientData.blood_group || 'Unknown'}

Current Issue: ${currentIssue}

Patient Assessments:
${assessments.map(assessment => `
- Date: ${assessment.assessment_date}
- Chief Complaint: ${assessment.chief_complaint}
- Medical Alerts: ${assessment.medical_alerts}
- Contraindications: ${assessment.contraindications}
- Treatment Priorities: ${assessment.treatment_priorities}
`).join('\n')}

Diagnostic Images:
${diagnosticImages.map(image => `- ${image.image_type}: ${image.notes}`).join('\n')}

Medical History:
${medicalHistory.map(record => `- ${record.record_type}: ${record.description}`).join('\n')}

Previous Treatments:
${previousTreatments.map(treatment => `- ${treatment.type}: ${treatment.description} (${treatment.status})`).join('\n')}

Insurance Information:
${JSON.stringify(insuranceInfo || 'No insurance information available')}

Patient Preferences:
${JSON.stringify(patientPreferences || 'No specific preferences recorded')}

Generate a detailed treatment plan including:
1. A concise title and summary of the recommended treatment approach
2. A primary treatment option with detailed description, risks, benefits, cost estimates, and timeline
3. At least two alternative treatment options with their comparative advantages/disadvantages
4. Cost analysis including estimated insurance coverage and out-of-pocket expenses
5. Required informed consent elements
6. Preventive measures and post-treatment care instructions
7. Follow-up schedule
8. Patient-friendly explanation of the treatment plan
9. Educational resources for the patient
10. Data analysis summary explaining how patient factors influenced the treatment recommendations

Format the response as a structured treatment plan that could be presented to both dental professionals and patients.`;

    // Call OpenAI API with comprehensive prompt
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an advanced dental AI assistant specializing in comprehensive treatment planning based on clinical evidence and best practices. You provide detailed, multi-option treatment plans with full risk, benefit, and cost analysis.',
        }, {
          role: 'user',
          content: prompt,
        }],
        temperature: 0.5,
        max_tokens: 4000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      throw new Error(`Failed to generate treatment plan: ${JSON.stringify(errorData)}`);
    }

    const aiResponse = await openAIResponse.json();
    const treatmentPlan = parseTreatmentPlan(aiResponse.choices[0].message.content);
    
    // Store the generated treatment plan in the database
    const { data: treatmentPlanData, error: treatmentPlanError } = await supabase
      .from('ai_treatment_plans')
      .insert([{
        patient_id: patientId,
        title: treatmentPlan.title,
        description: treatmentPlan.description,
        content: treatmentPlan,
        status: 'generated',
        created_at: new Date().toISOString()
      }])
      .select('id')
      .single();
      
    if (treatmentPlanError) {
      console.error('Error storing treatment plan:', treatmentPlanError);
    }

    return new Response(JSON.stringify(treatmentPlan), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Error generating treatment plan:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
});

function parseTreatmentPlan(aiResponse: string): TreatmentPlan {
  // In a production system, you'd implement more sophisticated parsing
  // based on the structured response from the AI.
  const sections = aiResponse.split('\n\n');
  
  // Extract title from the first line
  const title = sections[0].replace(/^#\s*|^\d+\.\s*/, '').trim();
  
  // Basic parsing of the AI response to create a structured treatment plan
  const treatmentPlan: TreatmentPlan = {
    title: title,
    description: sections[1] || 'Treatment plan based on comprehensive analysis of patient data.',
    summary: extractSection(aiResponse, 'Summary', 'Primary Treatment Option') || sections[2] || '',
    patientFriendlyExplanation: extractSection(aiResponse, 'Patient-Friendly Explanation', 'Educational Resources') || '',
    primaryOption: {
      type: extractValue(aiResponse, 'Type', 'Description') || 'Comprehensive Treatment',
      description: extractSection(aiResponse, 'Description', 'Estimated Cost') || 'Customized treatment plan based on patient needs.',
      estimatedCost: parseFloat(extractValue(aiResponse, 'Estimated Cost', 'Priority') || '1000'),
      priority: (extractValue(aiResponse, 'Priority', 'Risks') || 'medium') as 'high' | 'medium' | 'low',
      risks: extractList(aiResponse, 'Risks', 'Benefits'),
      benefits: extractList(aiResponse, 'Benefits', 'Success Rate'),
      successRate: parseFloat(extractValue(aiResponse, 'Success Rate', 'Recommended Materials') || '80'),
      recommendedMaterials: extractList(aiResponse, 'Recommended Materials', 'Timeline Estimate'),
      timelineEstimate: extractValue(aiResponse, 'Timeline Estimate', 'Follow-Up Plan') || '4-6 weeks',
      followUpPlan: extractValue(aiResponse, 'Follow-Up Plan', 'Alternative Treatment Options') || 'Regular check-ups as recommended by dentist.',
    },
    alternativeOptions: parseAlternativeOptions(aiResponse),
    preventiveMeasures: extractList(aiResponse, 'Preventive Measures', 'Precautions'),
    precautions: extractList(aiResponse, 'Precautions', 'Expected Outcome'),
    expectedOutcome: extractSection(aiResponse, 'Expected Outcome', 'Consent Requirements') || 'Improved dental health and resolution of current issues.',
    consentRequirements: {
      required: aiResponse.includes('Consent Required: Yes'),
      details: extractList(aiResponse, 'Consent Details', 'Post-Treatment Care'),
      risks: extractList(aiResponse, 'Consent Risks', 'Alternatives'),
      alternatives: extractList(aiResponse, 'Alternatives', 'Post-Treatment Care'),
    },
    postTreatmentCare: extractList(aiResponse, 'Post-Treatment Care', 'Follow-Up Schedule'),
    followUpSchedule: extractList(aiResponse, 'Follow-Up Schedule', 'Educational Resources'),
    educationalResources: extractList(aiResponse, 'Educational Resources', 'Patient Responsibilities'),
    patientResponsibilities: extractList(aiResponse, 'Patient Responsibilities', 'Cost Analysis'),
    estimatedTotalCost: parseFloat(extractValue(aiResponse, 'Total Cost', 'Insurance Coverage') || '1000'),
    estimatedInsuranceCoverage: parseFloat(extractValue(aiResponse, 'Insurance Coverage', 'Out-of-Pocket') || '0'),
    estimatedOutOfPocket: parseFloat(extractValue(aiResponse, 'Out-of-Pocket', 'Data Analysis') || '1000'),
    dataAnalysisSummary: extractSection(aiResponse, 'Data Analysis Summary', 'End') || 'Treatment plan generated based on comprehensive analysis of patient data.',
  };
  
  return treatmentPlan;
}

function extractSection(text: string, sectionStart: string, sectionEnd: string): string | null {
  const startPattern = new RegExp(`.*${sectionStart}:?\\s*`, 'i');
  const endPattern = new RegExp(`.*${sectionEnd}:?\\s*`, 'i');
  
  const startMatch = text.search(startPattern);
  if (startMatch === -1) return null;
  
  let startIndex = startMatch;
  // Move past the section header
  startIndex = text.indexOf('\n', startIndex);
  if (startIndex === -1) return null;
  startIndex++;
  
  const endMatch = text.substring(startIndex).search(endPattern);
  const endIndex = endMatch === -1 ? text.length : startIndex + endMatch;
  
  return text.substring(startIndex, endIndex).trim();
}

function extractValue(text: string, fieldName: string, nextFieldName: string): string | null {
  const pattern = new RegExp(`${fieldName}:\\s*([^\\n]+)(?:\\n|.*?${nextFieldName}:)`, 'i');
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function extractList(text: string, sectionName: string, nextSectionName: string): string[] {
  const section = extractSection(text, sectionName, nextSectionName);
  if (!section) return [];
  
  return section
    .split('\n')
    .map(line => line.replace(/^-\s*|\d+\.\s*/, '').trim())
    .filter(line => line.length > 0);
}

function parseAlternativeOptions(text: string): TreatmentOption[] {
  const alternativesSection = extractSection(text, 'Alternative Treatment Options', 'Preventive Measures');
  if (!alternativesSection) return [];
  
  // Simple parsing to extract alternatives - in a real system this would be more sophisticated
  const alternatives: TreatmentOption[] = [];
  
  // Split by Option headers (Option 1:, Option 2:, etc.)
  const optionBlocks = alternativesSection.split(/Option \d+:/);
  
  for (const block of optionBlocks) {
    if (!block.trim()) continue;
    
    alternatives.push({
      type: extractValue(block, 'Type', 'Description') || 'Alternative Treatment',
      description: extractSection(block, 'Description', 'Cost') || block.split('\n')[0].trim(),
      estimatedCost: parseFloat(extractValue(block, 'Cost', 'Priority') || extractValue(block, 'Estimated Cost', 'Priority') || '800'),
      priority: (extractValue(block, 'Priority', 'Risks') || 'medium') as 'high' | 'medium' | 'low',
      risks: extractList(block, 'Risks', 'Benefits'),
      benefits: extractList(block, 'Benefits', 'Success Rate'),
      successRate: parseFloat(extractValue(block, 'Success Rate', 'Materials') || '75'),
      recommendedMaterials: extractList(block, 'Materials', 'Timeline'),
      timelineEstimate: extractValue(block, 'Timeline', 'Follow-Up') || '6-8 weeks',
      followUpPlan: extractValue(block, 'Follow-Up', 'Next Option') || 'As recommended by dentist.'
    });
  }
  
  return alternatives;
}