import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Pill,
  FileText,
  Image,
  CircleDot,
  AlertCircle,
  CheckCircle2,
  Activity,
} from "lucide-react";

interface MedicalRecordDetailsProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
}

const formatDateTime = (dateTimeString: string | null | undefined) => {
  if (!dateTimeString) return 'N/A';
  return new Date(dateTimeString).toLocaleString();
};

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  );
};

export function MedicalRecordDetails({ record, isOpen, onClose }: MedicalRecordDetailsProps) {
  const details = record.description ? JSON.parse(record.description) : {};

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                {record.displayType || 'Medical Record'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatDateTime(record.record_date)}
                  {record.staff && (
                    <>
                      <User className="h-4 w-4 ml-2" />
                      {`${record.staff.first_name} ${record.staff.last_name}`}
                    </>
                  )}
                </div>
              </DialogDescription>
            </div>
            <StatusBadge status={details.status || 'Completed'} />
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="treatment">Treatment</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vital Signs */}
                  {details.vital_signs && (
                    <div className="space-y-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Vital Signs
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Blood Pressure: {details.vital_signs.blood_pressure}</div>
                        <div>Pulse Rate: {details.vital_signs.pulse_rate}</div>
                      </div>
                    </div>
                  )}

                  {/* Chief Complaint */}
                  {details.chief_complaint && (
                    <div className="space-y-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Chief Complaint
                      </h3>
                      <p className="text-sm">{details.chief_complaint}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Examination Findings */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <Stethoscope className="h-4 w-4" />
                  Examination Findings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {details.examination?.extra_oral && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Extra-oral Examination</h4>
                      <p className="text-sm text-muted-foreground">{details.examination.extra_oral}</p>
                    </div>
                  )}
                  {details.examination?.intra_oral && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Intra-oral Examination</h4>
                      <p className="text-sm text-muted-foreground">{details.examination.intra_oral}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Diagnosis */}
            {details.diagnosis && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4" />
                    Diagnosis
                  </h3>
                  <div className="space-y-4">
                    <p className="text-sm">{details.diagnosis.notes}</p>
                    {details.diagnosis.codes && (
                      <div className="flex flex-wrap gap-2">
                        {details.diagnosis.codes.map((code: string, index: number) => (
                          <Badge key={index} variant="secondary">{code}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="treatment" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <CircleDot className="h-4 w-4" />
                  Treatment Plan
                </h3>
                {details.treatment?.procedures ? (
                  <div className="space-y-4">
                    {details.treatment.phase && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Phase</h4>
                        <Badge>{details.treatment.phase}</Badge>
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Procedures</h4>
                      <div className="space-y-2">
                        {details.treatment.procedures.map((proc: any, index: number) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{proc.code}</span>
                                <p className="text-sm text-muted-foreground">{proc.description}</p>
                              </div>
                              {proc.estimated_cost && (
                                <Badge variant="outline">Est. Cost: ${proc.estimated_cost}</Badge>
                              )}
                            </div>
                            {proc.tooth_number && (
                              <div className="mt-2 text-sm">
                                <span className="text-muted-foreground">Tooth:</span> {proc.tooth_number}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No treatment procedures recorded.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <Pill className="h-4 w-4" />
                  Prescriptions
                </h3>
                {details.prescriptions?.length > 0 ? (
                  <div className="space-y-4">
                    {details.prescriptions.map((rx: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{rx.medication}</h4>
                          <Badge variant="outline">{rx.dosage}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>Frequency: {rx.frequency}</div>
                          <div>Duration: {rx.duration}</div>
                        </div>
                        {rx.instructions && (
                          <p className="mt-2 text-sm border-t pt-2">{rx.instructions}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No prescriptions issued.</p>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            {(details.instructions?.home_care || details.instructions?.follow_up) && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <CheckCircle2 className="h-4 w-4" />
                    Instructions & Follow-up
                  </h3>
                  <div className="space-y-4">
                    {details.instructions.home_care && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Home Care Instructions</h4>
                        <p className="text-sm text-muted-foreground">{details.instructions.home_care}</p>
                      </div>
                    )}
                    {details.instructions.follow_up && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Follow-up Date</h4>
                        <Badge variant="outline">{details.instructions.follow_up}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="attachments" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <Image className="h-4 w-4" />
                  Attachments
                </h3>
                {record.attachments ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* X-ray Images */}
                    {record.attachments.xray_images?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">X-ray Images</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {record.attachments.xray_images.map((img: any, index: number) => (
                            <img
                              key={index}
                              src={img.url}
                              alt={`X-ray ${index + 1}`}
                              className="rounded-lg border object-cover w-full aspect-square"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clinical Photos */}
                    {record.attachments.clinical_photos?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Clinical Photos</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {record.attachments.clinical_photos.map((photo: any, index: number) => (
                            <img
                              key={index}
                              src={photo.url}
                              alt={`Clinical photo ${index + 1}`}
                              className="rounded-lg border object-cover w-full aspect-square"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Documents */}
                    {record.attachments.documents?.length > 0 && (
                      <div className="md:col-span-2">
                        <h4 className="text-sm font-medium mb-2">Documents</h4>
                        <div className="space-y-2">
                          {record.attachments.documents.map((doc: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm">{doc.name}</span>
                              <Button variant="ghost" size="sm" asChild>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                  View
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No attachments available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 