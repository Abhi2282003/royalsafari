import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SetupUsers = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleSetup = async () => {
    setLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('setup-initial-users');

      if (error) throw error;

      setResults(data.results);
      
      const successCount = data.results.filter((r: any) => r.status === 'success').length;
      const existsCount = data.results.filter((r: any) => r.status === 'already_exists').length;

      if (successCount > 0) {
        toast({
          title: "Setup Complete",
          description: `Created ${successCount} user(s). ${existsCount} already existed.`,
        });
      } else if (existsCount === data.results.length) {
        toast({
          title: "Already Setup",
          description: "All users already exist in the system.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Initial System Setup</CardTitle>
          <CardDescription>
            Create the initial admin and staff users for the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <h3 className="font-semibold mb-2">Users to be created:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="font-mono">admin@system.local</span>
                  <span className="text-muted-foreground">→ Admin (Username: admin, Password: 1001)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-mono">shekhar@system.local</span>
                  <span className="text-muted-foreground">→ Staff (Username: shekhar, Password: 1001)</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={handleSetup}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up users...
                </>
              ) : (
                "Create Initial Users"
              )}
            </Button>
          </div>

          {results && (
            <div className="space-y-2">
              <h3 className="font-semibold">Results:</h3>
              {results.map((result: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  {result.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : result.status === 'already_exists' ? (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{result.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.status === 'success' && `Created with role: ${result.role}`}
                      {result.status === 'already_exists' && 'User already exists'}
                      {result.error && `Error: ${result.error}`}
                    </p>
                  </div>
                </div>
              ))}

              <Button
                onClick={() => window.location.href = '/login'}
                className="w-full mt-4"
                variant="outline"
              >
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupUsers;
