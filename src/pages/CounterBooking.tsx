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
  
  // Form state
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromCity] = useState("Pune");
  const [busName, setBusName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
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
    
    if (!busName || !customerName || !contactNumber || !destination || !actualAmount) {
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
        const destCapitalized = destination.charAt(0).toUpperCase() + destination.slice(1);
        await saveNewDestination(destCapitalized);
      }

      // Get first active route and bus for counter bookings (just to satisfy foreign key)
      const { data: anyRoute } = await supabase
        .from("routes")
        .select("id")
        .eq("active", true)
        .limit(1)
        .single();

      const { data: anyBus } = await supabase
        .from("buses")
        .select("id")
        .eq("active", true)
        .limit(1)
        .single();

      if (!anyRoute || !anyBus) {
        throw new Error("Please create at least one route and bus in master data first");
      }

      // Create booking (using dummy route/bus since this is counter booking)
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          booking_date: bookingDate,
          route_id: anyRoute.id,
          bus_id: anyBus.id,
          type: "COUNTER",
          created_by: user.id,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create booking items with all details in description
      const { error: itemsError } = await supabase
        .from("booking_items")
        .insert({
          booking_id: booking.id,
          customer_name: customerName,
          destination: destination,
          qty: parseInt(numberOfSeats),
          amount: parseFloat(actualAmount),
          surcharges: parseFloat(surcharges) || 0,
          description: `Bus: ${busName} | Contact: ${contactNumber} | From: ${fromCity} | To: ${destination}`,
        });

      if (itemsError) throw itemsError;

      toast({
        title: "Booking created!",
        description: `Counter booking for ${customerName} has been created successfully.`,
      });

      // Reset form
      setCustomerName("");
      setContactNumber("");
      setDestination("");
      setNumberOfSeats("1");
      setActualAmount("");
      setSurcharges("");
      setBusName("");
      
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromCity">From City</Label>
                <input
                  id="fromCity"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
                  value={fromCity}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bus">Bus Name *</Label>
                <input
                  id="bus"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={busName}
                  onChange={(e) => setBusName(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                  placeholder="e.g., Royal Travels"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <input
                  id="customerName"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number *</Label>
                <input
                  id="contactNumber"
                  type="tel"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="10-digit mobile number"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destination City *</Label>
                <input
                  id="destination"
                  type="text"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                  placeholder="e.g., Mumbai, Bangalore"
                  list="destination-suggestions"
                  required
                />
                <datalist id="destination-suggestions">
                  {destinations.map((city, idx) => (
                    <option key={idx} value={city} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seats">Number of Seats *</Label>
                <input
                  id="seats"
                  type="number"
                  min="1"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={numberOfSeats}
                  onChange={(e) => setNumberOfSeats(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Actual Amount (₹) *</Label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="surcharges">Surcharges (₹)</Label>
                <input
                  id="surcharges"
                  type="number"
                  step="0.01"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
