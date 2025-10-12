import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface AgentRow {
  agent_name: string;
  active?: boolean;
}

const BulkAgentUpload = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload an Excel file (.xlsx or .xls)",
        });
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const parseExcelFile = async (file: File): Promise<AgentRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          // Map the data to our agent structure
          const agents: AgentRow[] = jsonData.map((row) => ({
            agent_name: String(row.agent_name || row['Agent Name'] || row.name || row.Name || '').trim(),
            active: true
          })).filter(agent => agent.agent_name); // Remove empty names
          
          resolve(agents);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  };

  const insertAgentsInBatches = async (agents: AgentRow[], batchSize = 100) => {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    const batches = [];
    for (let i = 0; i < agents.length; i += batchSize) {
      batches.push(agents.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        const { data, error } = await supabase
          .from("agents")
          .insert(batch)
          .select();

        if (error) {
          results.failed += batch.length;
          results.errors.push(`Batch ${i + 1}: ${error.message}`);
        } else {
          results.success += data?.length || 0;
        }
      } catch (error: any) {
        results.failed += batch.length;
        results.errors.push(`Batch ${i + 1}: ${error.message}`);
      }

      // Update progress
      const progressPercent = ((i + 1) / batches.length) * 100;
      setProgress(progressPercent);
    }

    return results;
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please select an Excel file to upload",
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setResults(null);

    try {
      // Parse the Excel file
      toast({ title: "Parsing Excel file..." });
      const agents = await parseExcelFile(file);

      if (agents.length === 0) {
        toast({
          variant: "destructive",
          title: "No agents found",
          description: "The Excel file contains no valid agent names",
        });
        setUploading(false);
        return;
      }

      toast({ 
        title: "Uploading agents...", 
        description: `Found ${agents.length} agents to upload` 
      });

      // Insert agents in batches
      const uploadResults = await insertAgentsInBatches(agents);
      
      setResults(uploadResults);

      if (uploadResults.success > 0) {
        toast({
          title: "Upload completed!",
          description: `Successfully uploaded ${uploadResults.success} agents`,
        });
      }

      if (uploadResults.failed > 0) {
        toast({
          variant: "destructive",
          title: "Some agents failed to upload",
          description: `${uploadResults.failed} agents failed. Check the results below.`,
        });
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Agent Upload</h1>
        <p className="text-muted-foreground">Upload an Excel file to add multiple agents at once</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Excel File</CardTitle>
          <CardDescription>
            Excel file should have a column named "agent_name", "Agent Name", "name", or "Name"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={uploading}
                className="flex-1"
              />
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="min-w-[120px]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>

            {file && (
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  Selected file: <strong>{file.name}</strong>
                </AlertDescription>
              </Alert>
            )}

            {uploading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  {progress.toFixed(0)}% complete
                </p>
              </div>
            )}
          </div>

          {results && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Upload Results</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Alert className="border-success">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription>
                    <strong>{results.success}</strong> agents uploaded successfully
                  </AlertDescription>
                </Alert>

                {results.failed > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{results.failed}</strong> agents failed to upload
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {results.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-destructive">Errors:</h4>
                  <div className="rounded-lg bg-destructive/10 p-4 max-h-48 overflow-auto">
                    {results.errors.map((error, index) => (
                      <p key={index} className="text-sm text-destructive">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              <strong>Excel Format:</strong> Your Excel file should have at least one column with agent names. 
              The column can be named: "agent_name", "Agent Name", "name", or "Name". 
              Each row represents one agent.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkAgentUpload;
