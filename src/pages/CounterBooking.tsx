import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RouteBus {
  id: number;
  route_id: number;
  bus_id: number;
  routes: { id: number; route_name: string };
  buses: { id: number; bus_no: string; owner_name: string };
}

const CounterBooking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [routeBuses, setRouteBuses] = useState<RouteBus[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRouteBus, setSelectedRouteBus] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [destination, setDestination] = useState("");
  const [numberOfSeats, setNumberOfSeats] = useState(1);
  const [actualAmount, setActualAmount] = useState("");
  const [surcharges, setSurcharges] = useState("");

  useEffect(() => {
    fetchRouteBuses();
  }, []);

  const fetchRouteBuses = async () => {
    const { data } = await supabase
      .from("route_buses")
      .select("*, routes(*), buses(*)")
      .eq("active", true);
    
    if (data) setRouteBuses(data as RouteBus[]);
  };

  const calculateProfit = () => {
    const amount = parseFloat(actualAmount) || 0;
    const charges = parseFloat(surcharges) || 0;
    return ((amount + charges) * 0.10).toFixed(2);
  };

  const calculateTotal = () => {
    const amount = parseFloat(actualAmount) || 0;
    const charges = parseFloat(surcharges) || 0;
    return (amount + charges).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRouteBus || !customerName || !destination || !actualAmount) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields",
      });
      return;
    }

    setLoading(true);
    
    try {
      const [routeId, busId] = selectedRouteBus.split("-").map(Number);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          booking_date: bookingDate,
          route_id: routeId,
          bus_id: busId,
          type: "COUNTER",
          created_by: user.id,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create booking items
      const { error: itemsError } = await supabase
        .from("booking_items")
        .insert({
          booking_id: booking.id,
          customer_name: customerName,
          destination: destination,
          qty: numberOfSeats,
          amount: parseFloat(actualAmount),
          surcharges: parseFloat(surcharges) || 0,
          description: `Counter booking for ${customerName}`,
        });

      if (itemsError) throw itemsError;

      toast({
        title: "Booking created!",
        description: `Counter booking for ${customerName} has been created successfully.`,
      });

      // Reset form
      setCustomerName("");
      setDestination("");
      setNumberOfSeats(1);
      setActualAmount("");
      setSurcharges("");
      setSelectedRouteBus("");
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating booking",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Counter Booking</h1>
        <p className="text-sm md:text-base text-muted-foreground">Create offline bookings for walk-in customers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Booking Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Route | Bus | Owner *</Label>
                <Select value={selectedRouteBus} onValueChange={setSelectedRouteBus} required>
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

              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destination City *</Label>
                <Input
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., Mumbai, Bangalore"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seats">Number of Seats *</Label>
                <Input
                  id="seats"
                  type="number"
                  min="1"
                  value={numberOfSeats}
                  onChange={(e) => setNumberOfSeats(parseInt(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Actual Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="surcharges">Surcharges (₹)</Label>
                <Input
                  id="surcharges"
                  type="number"
                  step="0.01"
                  value={surcharges}
                  onChange={(e) => setSurcharges(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {actualAmount && (
              <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Actual Amount:</span>
                  <span className="font-medium">₹{parseFloat(actualAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Surcharges:</span>
                  <span className="font-medium">₹{(parseFloat(surcharges) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>Total:</span>
                  <span className="font-medium">₹{calculateTotal()}</span>
                </div>
                <div className="flex justify-between text-sm text-primary">
                  <span>Your Profit (10%):</span>
                  <span className="font-bold">₹{calculateProfit()}</span>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Booking..." : "Create Counter Booking"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CounterBooking;
