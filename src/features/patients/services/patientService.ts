import { api } from '@/lib/api';

/**
 * Service for handling patient-related API calls
 * Centralizes all patient data operations in one place
 */
export const patientService = {
  /**
   * Get all patients
   */
  async getAllPatients() {
    return api.patients.getAll();
  },
  
  /**
   * Get a patient by ID
   */
  async getPatientById(id: string) {
    return api.patients.getById(id);
  },
  
  /**
   * Create a new patient
   */
  async createPatient(patientData: any) {
    return api.patients.create(patientData);
  },
  
  /**
   * Update an existing patient
   */
  async updatePatient(id: string, patientData: any) {
    return api.patients.update(id, patientData);
  },
  
  /**
   * Upload patient profile photo
   */
  async uploadProfilePhoto(file: File, patientId: string) {
    return api.patients.uploadProfilePhoto(file, patientId);
  },
  
  /**
   * Upload patient signature
   */
  async uploadSignature(file: File, patientId: string) {
    return api.patients.uploadSignature(file, patientId);
  },
  
  /**
   * Add a document to a patient's records
   */
  async addDocument(file: File, patientId: string, docType: string, notes: string = '') {
    return api.patients.addDocument(file, patientId, docType, notes);
  },
  
  /**
   * Search for patients by query string
   */
  async searchPatients(query: string) {
    return api.patients.search(query);
  },
  
  /**
   * Get patient's treatment plans
   */
  async getPatientTreatmentPlans(patientId: string) {
    return api.patients.getTreatmentPlans(patientId);
  },
  
  /**
   * Get patient's medical records
   */
  async getPatientMedicalRecords(patientId: string) {
    return api.patients.getMedicalRecords(patientId);
  },

  /**
   * Get patient's selected dental history teeth
   */
  async getPatientDentalHistoryTeeth(patientId: string) {
    // This assumes api.patients.getPatientDentalHistoryTeeth exists or will be added
    return api.patients.getPatientDentalHistoryTeeth(patientId);
  }
};
