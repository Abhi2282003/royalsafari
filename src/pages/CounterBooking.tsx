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
  const [paymentMode, setPaymentMode] = useState("CASH");

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

  const printTicket = (bookingId: number, bookingDetails: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const ticketHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket - Booking #${bookingId}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .ticket { max-width: 400px; margin: 0 auto; border: 2px solid #000; padding: 20px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; }
          .label { font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 2px dashed #000; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="ticket">
          <div class="header">
            <h2>BUS TICKET</h2>
            <p>Booking ID: ${bookingId}</p>
          </div>
          <div class="row"><span class="label">Date:</span><span>${bookingDetails.bookingDate}</span></div>
          <div class="row"><span class="label">From:</span><span>${bookingDetails.fromCity}</span></div>
          <div class="row"><span class="label">To:</span><span>${bookingDetails.destination}</span></div>
          <div class="row"><span class="label">Bus:</span><span>${bookingDetails.busName}</span></div>
          <div class="row"><span class="label">Passenger:</span><span>${bookingDetails.customerName}</span></div>
          <div class="row"><span class="label">Contact:</span><span>${bookingDetails.contactNumber}</span></div>
          <div class="row"><span class="label">Seats:</span><span>${bookingDetails.numberOfSeats}</span></div>
          <div class="row"><span class="label">Amount:</span><span>₹${bookingDetails.actualAmount}</span></div>
          <div class="row"><span class="label">Surcharges:</span><span>₹${bookingDetails.surcharges || '0.00'}</span></div>
          <div class="row"><span class="label">Total:</span><span>₹${bookingDetails.total}</span></div>
          <div class="row"><span class="label">Payment:</span><span>${bookingDetails.paymentMode}</span></div>
          <div class="footer">
            <p>Thank you for traveling with us!</p>
            <p style="font-size: 12px;">Please keep this ticket for your journey</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(ticketHTML);
    printWindow.document.close();
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

      const { error: itemsError } = await supabase
        .from("booking_items")
        .insert({
          booking_id: booking.id,
          qty: parseInt(numberOfSeats),
          amount: parseFloat(actualAmount),
          surcharges: parseFloat(surcharges) || 0,
          customer_name: customerName,
          phone: contactNumber,
          destination: destination,
          description: `Counter booking from ${fromCity} to ${destination} via ${busName} (Payment: ${paymentMode})`,
        });

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Counter booking created successfully",
      });

      // Print ticket
      printTicket(booking.id, {
        bookingDate,
        fromCity,
        destination,
        busName,
        customerName,
        contactNumber,
        numberOfSeats,
        actualAmount,
        surcharges: surcharges || '0.00',
        total: calculateTotal(),
        paymentMode,
      });

      // Reset form
      setBusName("");
      setCustomerName("");
      setContactNumber("");
      setDestination("");
      setNumberOfSeats("1");
      setActualAmount("");
      setSurcharges("");
      setPaymentMode("CASH");
      
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

              <div className="space-y-2">
                <Label htmlFor="paymentMode">Payment Mode *</Label>
                <select
                  id="paymentMode"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="NET_BANKING">Net Banking</option>
                </select>
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
              {loading ? "Creating Booking..." : "Create Booking & Print"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CounterBooking;
