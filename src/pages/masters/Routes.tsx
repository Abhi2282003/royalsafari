import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";

interface Route {
  id: number;
  route_name: string;
  from_city: string | null;
  to_city: string | null;
  active: boolean;
}

interface Destination {
  id: number;
  city_name: string;
}

const Routes = () => {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRoutes();
    fetchDestinations();
  }, []);

  const fetchRoutes = async () => {
    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .order("route_name");

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setRoutes(data || []);
    }
    setLoading(false);
  };

  const fetchDestinations = async () => {
    const { data, error } = await supabase
      .from("destinations")
      .select("id, city_name")
      .eq("active", true)
      .order("city_name");

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setDestinations(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromCity.trim() || !toCity.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter both From and To cities" });
      return;
    }

    const fromCityCapitalized = fromCity.trim().charAt(0).toUpperCase() + fromCity.trim().slice(1);
    const toCityCapitalized = toCity.trim().charAt(0).toUpperCase() + toCity.trim().slice(1);

    if (fromCityCapitalized === toCityCapitalized) {
      toast({ variant: "destructive", title: "Error", description: "From and To cities cannot be the same" });
      return;
    }

    setSubmitting(true);

    try {
      // Add cities to destinations if they don't exist
      const citiesToAdd = [fromCityCapitalized, toCityCapitalized];
      for (const city of citiesToAdd) {
        const { data: existingCity } = await supabase
          .from("destinations")
          .select("id")
          .eq("city_name", city)
          .maybeSingle();
        
        if (!existingCity) {
          await supabase
            .from("destinations")
            .insert({ city_name: city, active: true });
          
          setDestinations(prev => [...prev, { id: 0, city_name: city }]);
        }
      }

      const routeName = `${fromCityCapitalized}-${toCityCapitalized}`;
      
      const { error } = await supabase
        .from("routes")
        .insert([{ 
          route_name: routeName,
          from_city: fromCityCapitalized,
          to_city: toCityCapitalized,
          active: true 
        }]);

      if (error) throw error;

      toast({ title: "Route created successfully!" });
      setFromCity("");
      setToCity("");
      setDialogOpen(false);
      fetchRoutes();
      fetchDestinations();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from("routes")
      .update({ active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      fetchRoutes();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Routes</h1>
          <p className="text-muted-foreground">Manage your travel routes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Route</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fromCity">From City *</Label>
                <Input
                  id="fromCity"
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                  placeholder="Enter or select city"
                  list="from-city-suggestions"
                  required
                />
                <datalist id="from-city-suggestions">
                  {destinations.map((dest) => (
                    <option key={dest.id} value={dest.city_name} />
                  ))}
                </datalist>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="toCity">To City *</Label>
                <Input
                  id="toCity"
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                  placeholder="Enter or select city"
                  list="to-city-suggestions"
                  required
                />
                <datalist id="to-city-suggestions">
                  {destinations.map((dest) => (
                    <option key={dest.id} value={dest.city_name} />
                  ))}
                </datalist>
              </div>
              
              <Button type="submit" className="w-full" disabled={submitting || !fromCity.trim() || !toCity.trim()}>
                {submitting ? "Creating..." : "Create Route"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Routes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From City</TableHead>
                <TableHead>To City</TableHead>
                <TableHead>Route Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell className="font-medium">{route.from_city || "-"}</TableCell>
                  <TableCell className="font-medium">{route.to_city || "-"}</TableCell>
                  <TableCell>{route.route_name}</TableCell>
                  <TableCell>
                    {route.active ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(route.id, route.active)}
                    >
                      {route.active ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Routes;
