import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Trash2, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RouteBusMapping {
  id: number;
  route_name: string;
  bus_no: string;
  owner_name: string;
}

const RouteBusesSimplified = () => {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<RouteBusMapping[]>([]);
  const [routeNames, setRouteNames] = useState<string[]>([]);
  const [busOptions, setBusOptions] = useState<string[]>([]);
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedBus, setSelectedBus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch route-bus mappings
    const { data: rbData } = await supabase
      .from("route_buses")
      .select(`
        id,
        routes(route_name),
        buses(bus_no, owner_name)
      `)
      .eq("active", true);

    if (rbData) {
      const mapped = rbData.map((rb: any) => ({
        id: rb.id,
        route_name: rb.routes?.route_name || "",
        bus_no: rb.buses?.bus_no || "",
        owner_name: rb.buses?.owner_name || "",
      }));
      setMappings(mapped);
    }

    // Fetch routes
    const { data: routes } = await supabase
      .from("routes")
      .select("route_name")
      .eq("active", true);
    
    if (routes) {
      setRouteNames([...new Set(routes.map(r => r.route_name))]);
    }

    // Fetch buses
    const { data: buses } = await supabase
      .from("buses")
      .select("bus_no, owner_name")
      .eq("active", true);
    
    if (buses) {
      setBusOptions(buses.map(b => `${b.bus_no} (${b.owner_name})`));
    }
  };

  const handleAdd = async () => {
    if (!selectedRoute || !selectedBus) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please select both route and bus",
      });
      return;
    }

    setLoading(true);

    try {
      // Get route ID
      const { data: route } = await supabase
        .from("routes")
        .select("id")
        .eq("route_name", selectedRoute)
        .single();

      if (!route) {
        throw new Error("Route not found");
      }

      // Get bus ID
      const busNo = selectedBus.split('(')[0].trim();
      const { data: bus } = await supabase
        .from("buses")
        .select("id")
        .eq("bus_no", busNo)
        .single();

      if (!bus) {
        throw new Error("Bus not found");
      }

      // Create mapping
      const { error } = await supabase
        .from("route_buses")
        .insert({
          route_id: route.id,
          bus_id: bus.id,
        });

      if (error) throw error;

      toast({ title: "Route-Bus mapping added successfully!" });
      setSelectedRoute("");
      setSelectedBus("");
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from("route_buses")
      .update({ active: false })
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error deleting mapping",
        description: error.message,
      });
    } else {
      toast({ title: "Mapping removed successfully!" });
      fetchData();
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Route-Bus Mapping</h1>
        <p className="text-sm md:text-base text-muted-foreground">Link routes with buses</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Route</Label>
              <AutocompleteInput
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                onValueSelect={setSelectedRoute}
                suggestions={routeNames}
                placeholder="Select route"
              />
            </div>
            <div className="space-y-2">
              <Label>Bus</Label>
              <AutocompleteInput
                value={selectedBus}
                onChange={(e) => setSelectedBus(e.target.value)}
                onValueSelect={setSelectedBus}
                suggestions={busOptions}
                placeholder="Select bus"
              />
            </div>
            <div className="space-y-2">
              <Label className="opacity-0">Action</Label>
              <Button onClick={handleAdd} disabled={loading} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Mapping
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Bus No</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No mappings found
                    </TableCell>
                  </TableRow>
                ) : (
                  mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-medium">{mapping.route_name}</TableCell>
                      <TableCell>{mapping.bus_no}</TableCell>
                      <TableCell>{mapping.owner_name}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(mapping.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RouteBusesSimplified;
