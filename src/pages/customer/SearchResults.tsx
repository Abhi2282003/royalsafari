import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Bus, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BusResult {
  id: number;
  bus_no: string;
  bus_type: string;
  owner_name: string;
  route_id: number;
  route_name: string;
}

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [buses, setBuses] = useState<BusResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fromCity = searchParams.get("from") || "";
  const toCity = searchParams.get("to") || "";
  const dateStr = searchParams.get("date") || "";

  useEffect(() => {
    fetchAvailableBuses();
  }, []);

  const fetchAvailableBuses = async () => {
    try {
      // Fetch routes matching the from/to cities
      const { data: routes } = await supabase
        .from("routes")
        .select("id, route_name, from_city, to_city")
        .eq("active", true)
        .ilike("from_city", `%${fromCity}%`)
        .ilike("to_city", `%${toCity}%`);

      if (!routes || routes.length === 0) {
        toast.error("No routes found for selected cities");
        setBuses([]);
        setLoading(false);
        return;
      }

      const routeIds = routes.map(r => r.id);

      // Fetch buses for these routes
      const { data: routeBuses } = await supabase
        .from("route_buses")
        .select(`
          bus_id,
          route_id,
          buses (
            id,
            bus_no,
            bus_type,
            owner_name
          ),
          routes (
            route_name
          )
        `)
        .in("route_id", routeIds)
        .eq("active", true);

      if (routeBuses) {
        const busResults: BusResult[] = routeBuses
          .filter(rb => rb.buses && rb.routes)
          .map(rb => ({
            id: rb.buses.id,
            bus_no: rb.buses.bus_no,
            bus_type: rb.buses.bus_type,
            owner_name: rb.buses.owner_name,
            route_id: rb.route_id,
            route_name: rb.routes.route_name,
          }));
        
        setBuses(busResults);
      }
    } catch (error) {
      console.error("Error fetching buses:", error);
      toast.error("Failed to fetch buses");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBus = (bus: BusResult) => {
    navigate(`/customer/seats?busId=${bus.id}&routeId=${bus.route_id}&date=${dateStr}&from=${fromCity}&to=${toCity}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">BusBooking</span>
          </div>
        </div>
      </header>

      <div className="container py-6">
        {/* Search Info */}
        <div className="mb-6 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">From: </span>
              <span className="font-semibold">{fromCity}</span>
            </div>
            <div>→</div>
            <div>
              <span className="text-muted-foreground">To: </span>
              <span className="font-semibold">{toCity}</span>
            </div>
            <div>|</div>
            <div>
              <span className="text-muted-foreground">Date: </span>
              <span className="font-semibold">{format(new Date(dateStr), "PPP")}</span>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Searching for buses...</p>
          </div>
        ) : buses.length === 0 ? (
          <Card className="p-12 text-center">
            <Bus className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No buses found</h3>
            <p className="text-muted-foreground mb-4">
              No buses available for the selected route and date
            </p>
            <Button onClick={() => navigate("/customer")}>
              Try Different Search
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {buses.length} {buses.length === 1 ? "Bus" : "Buses"} Available
            </h2>
            {buses.map((bus) => (
              <Card key={bus.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{bus.bus_no}</h3>
                      <Badge variant="secondary">{bus.bus_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <Clock className="inline h-4 w-4 mr-1" />
                      {bus.route_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Operated by: {bus.owner_name}
                    </p>
                  </div>
                  <Button onClick={() => handleSelectBus(bus)} size="lg">
                    View Seats
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}