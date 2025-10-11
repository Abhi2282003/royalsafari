import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SeatSelectionMode from "@/components/SeatSelectionMode";

interface RouteBus {
  id: number;
  route_id: number;
  bus_id: number;
  routes: { id: number; route_name: string };
  buses: { id: number; bus_no: string; owner_name: string; bus_type: "SLEEPER" | "SEATING_SLEEPER" };
}

interface Agent {
  id: number;
  agent_name: string;
}

const AddBooking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [routeBuses, setRouteBuses] = useState<RouteBus[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRouteBus, setSelectedRouteBus] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: rbData } = await supabase
      .from("route_buses")
      .select("*, routes(*), buses(*)")
      .eq("active", true);
    
    const { data: agentData } = await supabase
      .from("agents")
      .select("*")
      .eq("active", true);
    
    if (rbData) setRouteBuses(rbData as RouteBus[]);
    if (agentData) setAgents(agentData);
  };

  const getSelectedRoute = () => {
    if (!selectedRouteBus) return null;
    const [routeId, busId] = selectedRouteBus.split("-").map(Number);
    return { routeId, busId };
  };

  const selectedBus = routeBuses.find(rb => `${rb.route_id}-${rb.bus_id}` === selectedRouteBus);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Booking</h1>
        <p className="text-muted-foreground">Select seats and book directly from the visual layout</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Booking Date</Label>
              <Input
                id="date"
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Route | Bus | Owner</Label>
              <Select value={selectedRouteBus} onValueChange={setSelectedRouteBus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select route and bus" />
                </SelectTrigger>
                <SelectContent>
                  {routeBuses.map((rb) => (
                    <SelectItem key={rb.id} value={`${rb.route_id}-${rb.bus_id}`}>
                      {rb.routes.route_name} | {rb.buses.bus_no} | {rb.buses.owner_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedRouteBus && selectedBus && getSelectedRoute() && (
        <SeatSelectionMode
          busType={selectedBus.buses.bus_type}
          agents={agents}
          bookingDate={bookingDate}
          routeId={getSelectedRoute()!.routeId}
          busId={getSelectedRoute()!.busId}
          onBookingComplete={() => {
            toast({ title: "Booking completed! Redirecting to dashboard..." });
            setTimeout(() => navigate("/"), 1500);
          }}
        />
      )}

      {!selectedRouteBus && (
        <div className="text-center py-12 text-muted-foreground">
          Please select a date, route, and bus to start booking
        </div>
      )}
    </div>
  );
};

export default AddBooking;
