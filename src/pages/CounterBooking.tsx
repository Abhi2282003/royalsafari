import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

const CounterBooking = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [busNames, setBusNames] = useState<string[]>([]);
  const [routeNames, setRouteNames] = useState<string[]>([]);
  
  // Form state
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [routeName, setRouteName] = useState("");
  const [busName, setBusName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [destination, setDestination] = useState("");
  const [numberOfSeats, setNumberOfSeats] = useState("1");
  const [actualAmount, setActualAmount] = useState("");
  const [surcharges, setSurcharges] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch destinations
    const { data: destData } = await supabase
      .from("destinations")
      .select("city_name")
      .eq("active", true)
      .order("city_name");
    
    if (destData) {
      setDestinations(destData.map(d => d.city_name));
    }

    // Fetch existing routes
    const { data: routeData } = await supabase
      .from("routes")
      .select("route_name")
      .eq("active", true);
    
    if (routeData) {
      setRouteNames([...new Set(routeData.map(r => r.route_name))]);
    }

    // Fetch existing buses
    const { data: busData } = await supabase
      .from("buses")
      .select("bus_no, owner_name")
      .eq("active", true);
    
    if (busData) {
      setBusNames([...new Set(busData.map(b => `${b.bus_no} (${b.owner_name})`))]);
    }
  };

  const saveNewDestination = async (cityName: string) => {
    const { error } = await supabase
      .from("destinations")
      .insert({ city_name: cityName })
      .select()
      .single();
    
    if (!error) {
      setDestinations([...destinations, cityName]);
    }
  };

  const saveNewRoute = async (routeName: string) => {
    const { error } = await supabase
      .from("routes")
      .insert({ route_name: routeName })
      .select()
      .single();
    
    if (!error) {
      setRouteNames([...routeNames, routeName]);
    }
  };

  const saveNewBus = async (busInfo: string) => {
    // Extract bus number (before parenthesis)
    const busNo = busInfo.split('(')[0].trim();
    const ownerName = busInfo.includes('(') 
      ? busInfo.split('(')[1].replace(')', '').trim()
      : 'Owner';

    const { error } = await supabase
      .from("buses")
      .insert({ 
        bus_no: busNo,
        owner_name: ownerName,
        bus_type: "SLEEPER" // default
      })
      .select()
      .single();
    
    if (!error) {
      setBusNames([...busNames, `${busNo} (${ownerName})`]);
    }
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
    
    if (!routeName || !busName || !customerName || !destination || !actualAmount) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Save new destination if not exists
      if (!destinations.includes(destination)) {
        await saveNewDestination(destination);
      }

      // Get or create route
      let routeId: number;
      const { data: existingRoute } = await supabase
        .from("routes")
        .select("id")
        .eq("route_name", routeName)
        .single();
      
      if (existingRoute) {
        routeId = existingRoute.id;
      } else {
        const { data: newRoute } = await supabase
          .from("routes")
          .insert({ route_name: routeName })
          .select("id")
          .single();
        routeId = newRoute!.id;
        await saveNewRoute(routeName);
      }

      // Get or create bus
      let busId: number;
      const busNo = busName.split('(')[0].trim();
      const { data: existingBus } = await supabase
        .from("buses")
        .select("id")
        .eq("bus_no", busNo)
        .single();
      
      if (existingBus) {
        busId = existingBus.id;
      } else {
        const ownerName = busName.includes('(') 
          ? busName.split('(')[1].replace(')', '').trim()
          : 'Owner';
        const { data: newBus } = await supabase
          .from("buses")
          .insert({ 
            bus_no: busNo,
            owner_name: ownerName,
            bus_type: "SLEEPER"
          })
          .select("id")
          .single();
        busId = newBus!.id;
        await saveNewBus(busName);
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
          qty: parseInt(numberOfSeats),
          amount: parseFloat(actualAmount),
          surcharges: parseFloat(surcharges) || 0,
          description: `Counter booking for ${customerName} to ${destination}`,
        });

      if (itemsError) throw itemsError;

      toast({
        title: "Booking created!",
        description: `Counter booking for ${customerName} has been created successfully.`,
      });

      // Reset form
      setCustomerName("");
      setDestination("");
      setNumberOfSeats("1");
      setActualAmount("");
      setSurcharges("");
      
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
                <input
                  id="date"
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="route">Route Name *</Label>
                <AutocompleteInput
                  id="route"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  onValueSelect={setRouteName}
                  suggestions={routeNames}
                  placeholder="Enter or select route"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bus">Bus Name (Bus No) *</Label>
                <AutocompleteInput
                  id="bus"
                  value={busName}
                  onChange={(e) => setBusName(e.target.value)}
                  onValueSelect={setBusName}
                  suggestions={busNames}
                  placeholder="e.g., MH12AB1234 (Owner Name)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <AutocompleteInput
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  suggestions={[]}
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destination City *</Label>
                <AutocompleteInput
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  onValueSelect={setDestination}
                  suggestions={destinations}
                  placeholder="e.g., Mumbai, Pune"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seats">Number of Seats *</Label>
                <AutocompleteInput
                  id="seats"
                  type="number"
                  min="1"
                  value={numberOfSeats}
                  onChange={(e) => setNumberOfSeats(e.target.value)}
                  suggestions={[]}
                  enableAutoCapitalize={false}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Actual Amount (₹) *</Label>
                <AutocompleteInput
                  id="amount"
                  type="number"
                  step="0.01"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  suggestions={[]}
                  placeholder="0.00"
                  enableAutoCapitalize={false}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="surcharges">Surcharges (₹)</Label>
                <AutocompleteInput
                  id="surcharges"
                  type="number"
                  step="0.01"
                  value={surcharges}
                  onChange={(e) => setSurcharges(e.target.value)}
                  suggestions={[]}
                  placeholder="0.00"
                  enableAutoCapitalize={false}
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
