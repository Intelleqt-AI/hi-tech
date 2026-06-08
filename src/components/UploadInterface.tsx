import React, { useRef, useState, useEffect } from 'react';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import { Upload, FileText, Image, Users, Wrench, Flag, CheckCircle, Clock, XCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface UploadInterfaceProps {
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
}

type ReportType = 'efficiency' | 'factory' | 'qc' | 'waste';
type ProcessingStatus = 'pending' | 'processing' | 'processed' | 'error' | 'flagged';

interface UploadRecord {
  id: string;
  file_name: string;
  file_url: string | null;
  report_type: string;
  status: string;
  error_message: string | null;
  flagged: boolean | null;
  flag_reason: string | null;
  uploaded_at: string;
  processed_at: string | null;
}

const UploadInterface = ({ uploadedFiles, setUploadedFiles }: UploadInterfaceProps) => {
  const [isDragging, setIsDragging] = useState<ReportType | null>(null);
  const [isFullScreenDrag, setIsFullScreenDrag] = useState(false);
  const [uploadRecords, setUploadRecords] = useState<UploadRecord[]>([]);
  const { toast } = useToast();
  
  const fileInputRefs = {
    efficiency: useRef<HTMLInputElement>(null),
    factory: useRef<HTMLInputElement>(null),
    qc: useRef<HTMLInputElement>(null),
    waste: useRef<HTMLInputElement>(null),
  };

  const reportTypes = [
    {
      type: 'efficiency' as ReportType,
      title: 'Efficiency & Casual Check',
      icon: Users,
      color: 'border-purple-200 bg-purple-50 hover:bg-purple-100'
    },
    {
      type: 'factory' as ReportType,
      title: 'Factory Floor Log',
      icon: Wrench,
      color: 'border-gray-200 bg-gray-50 hover:bg-gray-100'
    },
    {
      type: 'qc' as ReportType,
      title: 'QC Report',
      icon: AlertTriangle,
      color: 'border-orange-200 bg-orange-50 hover:bg-orange-100'
    },
    {
      type: 'waste' as ReportType,
      title: 'Waste Summary',
      icon: Trash2,
      color: 'border-red-200 bg-red-50 hover:bg-red-100'
    }
  ];

  useEffect(() => {
    loadUploadRecords();
    
    // Set up auto-refresh to check for processing updates
    const interval = setInterval(loadUploadRecords, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadUploadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('upload_status')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error loading upload records:', error);
        return;
      }

      setUploadRecords(data || []);
    } catch (error) {
      console.error('Error loading upload records:', error);
    }
  };

  // Full screen drag & drop handlers
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      setIsFullScreenDrag(true);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX === 0 && e.clientY === 0) {
        setIsFullScreenDrag(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsFullScreenDrag(false);
      
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        handleFiles(files, 'qc');
        toast({
          title: "Files uploaded",
          description: `${files.length} file(s) uploaded to Quality Control`,
        });
      }
    };

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent, type: ReportType) => {
    e.preventDefault();
    setIsDragging(type);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(null);
  };

  const handleDrop = (e: React.DragEvent, type: ReportType) => {
    e.preventDefault();
    setIsDragging(null);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files, type);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: ReportType) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files, type);
    }
  };

  const handleFiles = async (files: File[], type: ReportType) => {
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      return isImage || isPDF;
    });
    
    if (validFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Please upload only images (PNG, JPEG, GIF, WEBP) or PDF files",
        variant: "destructive"
      });
      return;
    }

    for (const file of validFiles) {
      await uploadAndProcessFile(file, type);
    }
  };

  const uploadAndProcessFile = async (file: File, reportType: ReportType) => {
    try {
      console.log('Starting upload for:', file.name, 'Type:', reportType);
      
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${reportType}/${fileName}`;

      const isPDF = file.type === 'application/pdf';
      
      toast({
        title: "Uploading file",
        description: `Uploading ${file.name} for ${reportType} processing...`,
      });

      // Upload file to Supabase storage
      console.log('Uploading to storage:', filePath);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      console.log('File uploaded, public URL:', publicUrl);

      // Insert upload record
      const { data: uploadRecord, error: insertError } = await supabase
        .from('upload_status')
        .insert({
          file_name: file.name,
          file_url: publicUrl,
          report_type: reportType,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Failed to create upload record: ${insertError.message}`);
      }

      console.log('Upload record created:', uploadRecord.id);

      toast({
        title: "File uploaded",
        description: `${file.name} uploaded successfully. Starting OCR processing...`,
      });

      // Trigger OCR processing via edge function
      console.log('Calling OCR function...');
      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('process-ocr', {
        body: {
          uploadId: uploadRecord.id,
          fileUrl: publicUrl,
          reportType: reportType,
          fileType: isPDF ? 'pdf' : 'image'
        }
      });

      if (ocrError) {
        console.error('OCR function error:', ocrError);
        throw new Error(`OCR processing failed: ${ocrError.message}`);
      }

      console.log('OCR processing result:', ocrResult);

      toast({
        title: "Processing complete",
        description: `${file.name} has been processed and data extracted successfully!`,
      });

      // Reload upload records to show updated status
      loadUploadRecords();

    } catch (error) {
      console.error('Upload and processing error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const flagUpload = async (uploadId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('upload_status')
        .update({ 
          flagged: true, 
          flag_reason: reason,
          status: 'flagged'
        })
        .eq('id', uploadId);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Upload flagged",
        description: "Upload has been flagged for manual review",
      });

      loadUploadRecords();
    } catch (error) {
      console.error('Flag error:', error);
      toast({
        title: "Flag failed",
        description: "Failed to flag upload",
        variant: "destructive"
      });
    }
  };

  const clearUploadHistory = async () => {
    try {
      // First get all records to delete them properly
      const { data: allRecords, error: fetchError } = await supabase
        .from('upload_status')
        .select('id');

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (allRecords && allRecords.length > 0) {
        // Delete records in batches to avoid potential limits
        const recordIds = allRecords.map(record => record.id);
        
        const { error: deleteError } = await supabase
          .from('upload_status')
          .delete()
          .in('id', recordIds);

        if (deleteError) {
          throw new Error(deleteError.message);
        }
      }

      toast({
        title: "History cleared",
        description: "All upload records have been removed",
      });

      // Clear local state immediately
      setUploadRecords([]);
    } catch (error) {
      console.error('Clear history error:', error);
      toast({
        title: "Clear failed",
        description: "Failed to clear upload history",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string, flagged?: boolean | null) => {
    if (flagged) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <Flag className="h-3 w-3" />
          🔴 Failed
        </Badge>
      );
    }

    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            ⏳ Processing
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ⏳ Processing
          </Badge>
        );
      case 'processed':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            🟢 Completed
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            🔴 Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getReportTypeDisplay = (reportType: string) => {
    const typeMap = {
      efficiency: 'Efficiency',
      factory: 'Factory',
      qc: 'QC',
      waste: 'Waste'
    };
    return typeMap[reportType as keyof typeof typeMap] || reportType;
  };

  return (
    <>
      {/* Full Screen Drag Overlay */}
      {isFullScreenDrag && (
        <div className="fixed inset-0 z-50 bg-blue-500 bg-opacity-20 border-4 border-dashed border-blue-500 flex items-center justify-center">
          <div className="text-center">
            <Upload className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-blue-900 mb-2">Drop files anywhere</h3>
            <p className="text-blue-700">Files will be uploaded to Quality Control</p>
          </div>
        </div>
      )}

      <section className="mb-6">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {reportTypes.map((reportType) => {
            const IconComponent = reportType.icon;
            const isCurrentlyDragging = isDragging === reportType.type;
            
            return (
              <div
                key={reportType.type}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer h-24 flex flex-col justify-center ${
                  reportType.color
                } ${isCurrentlyDragging ? 'border-opacity-60 bg-opacity-20 shadow-md' : 'hover:shadow-sm'}`}
                onDragOver={(e) => handleDragOver(e, reportType.type)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, reportType.type)}
                onClick={() => fileInputRefs[reportType.type].current?.click()}
              >
                <div className="flex items-center justify-center mb-2">
                  <IconComponent className="h-5 w-5 text-gray-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{reportType.title}</h3>
                <div className="flex items-center justify-center text-xs text-gray-500">
                  <Upload className="h-3 w-3 mr-1" />
                  Drop or click
                </div>
                <input
                  ref={fileInputRefs[reportType.type]}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={(e) => handleFileSelect(e, reportType.type)}
                  className="hidden"
                />
              </div>
            );
          })}
        </div>

        {uploadRecords.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Recent Uploads</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={clearUploadHistory}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </Button>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="upload-history" className="border border-gray-200 rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">View Upload History ({uploadRecords.length} files)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {uploadRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          {record.file_name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <Image className="h-5 w-5 text-gray-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-gray-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{record.file_name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                {getReportTypeDisplay(record.report_type)}
                              </span>
                              <p className="text-xs text-gray-500">
                                {fmtDate(record.uploaded_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getStatusBadge(record.status, record.flagged)}
                          
                          {(record.status === 'error' || record.status === 'processed') && !record.flagged && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs"
                              onClick={() => flagUpload(record.id, 'Requires manual review')}
                            >
                              <Flag className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </section>
    </>
  );
};

export default UploadInterface;
