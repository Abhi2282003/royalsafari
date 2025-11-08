import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bus, CreditCard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);

  const busId = searchParams.get("busId");
  const routeId = searchParams.get("routeId");
  const dateStr = searchParams.get("date");
  const fromCity = searchParams.get("from");
  const toCity = searchParams.get("to");
  const seats = searchParams.get("seats")?.split(",") || [];
  const passengersData = JSON.parse(searchParams.get("passengers") || "[]");

  const pricePerSeat = 500; // Fixed price for demo
  const totalAmount = seats.length * pricePerSeat;

  const handlePayment = async () => {
    setProcessing(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          bus_id: parseInt(busId!),
          route_id: parseInt(routeId!),
          booking_date: new Date(dateStr!).toISOString(),
          type: "CUSTOMER",
          created_by: "00000000-0000-0000-0000-000000000000", // Dummy UUID for guest bookings
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create booking items
      const bookingItems = seats.map((seat, index) => ({
        booking_id: booking.id,
        seat_no: seat,
        customer_name: passengersData[index].name,
        phone: passengersData[index].phone,
        age: parseInt(passengersData[index].age),
        destination: toCity,
        amount: pricePerSeat,
        qty: 1,
      }));

      const { error: itemsError } = await supabase
        .from("booking_items")
        .insert(bookingItems);

      if (itemsError) throw itemsError;

      toast.success("Booking confirmed!");
      navigate(`/customer/confirmation?bookingId=${booking.id}`);
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Failed to complete booking");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Payment</span>
          </div>
        </div>
      </header>

      <div className="container py-6 max-w-2xl">
        <div className="grid gap-6">
          {/* Booking Summary */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Booking Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Route</span>
                <span className="font-medium">{fromCity} → {toCity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{format(new Date(dateStr!), "PPP")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seats</span>
                <span className="font-medium">{seats.join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Passengers</span>
                <span className="font-medium">{seats.length}</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-base">
                <span>Total Amount</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>
          </Card>

          {/* Payment Method */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Select Payment Method</h3>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                <RadioGroupItem value="upi" id="upi" />
                <Label htmlFor="upi" className="flex-1 cursor-pointer flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">UPI</div>
                    <div className="text-xs text-muted-foreground">Pay using UPI apps</div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex-1 cursor-pointer flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Credit/Debit Card</div>
                    <div className="text-xs text-muted-foreground">Visa, Mastercard, Rupay</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </Card>

          {/* Demo Notice */}
          <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 p-4 text-sm">
            <p className="text-yellow-800 dark:text-yellow-200">
              <strong>Demo Mode:</strong> This is a dummy payment gateway. Your booking will be confirmed automatically without actual payment.
            </p>
          </div>

          <Button 
            onClick={handlePayment} 
            size="lg" 
            className="w-full"
            disabled={processing}
          >
            {processing ? "Processing..." : `Pay ₹${totalAmount}`}
          </Button>
        </div>
      </div>
    </div>
  );
}