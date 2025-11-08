import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bus, CheckCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function Confirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    const { data } = await supabase
      .from("bookings")
      .select(`
        *,
        buses (bus_no, bus_type),
        routes (route_name, from_city, to_city),
        booking_items (
          seat_no,
          customer_name,
          phone,
          age,
          amount
        )
      `)
      .eq("id", parseInt(bookingId!))
      .single();

    if (data) setBooking(data);
  };

  if (!booking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalAmount = booking.booking_items.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center gap-2">
          <Bus className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">BusBooking</span>
        </div>
      </header>

      <div className="container py-12 max-w-2xl">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-muted-foreground">
            Your ticket has been booked successfully
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold mb-4">Booking Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking ID</span>
                <span className="font-medium">#{booking.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bus Number</span>
                <span className="font-medium">{booking.buses.bus_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Route</span>
                <span className="font-medium">{booking.routes.from_city} → {booking.routes.to_city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Journey Date</span>
                <span className="font-medium">{format(new Date(booking.booking_date), "PPP")}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Passenger Details</h3>
            <div className="space-y-3">
              {booking.booking_items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between text-sm p-3 bg-muted/50 rounded">
                  <div>
                    <div className="font-medium">{item.customer_name}</div>
                    <div className="text-muted-foreground">
                      Seat {item.seat_no} • Age {item.age} • {item.phone}
                    </div>
                  </div>
                  <div className="font-medium">₹{item.amount}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between font-semibold text-lg">
              <span>Total Amount</span>
              <span>₹{totalAmount}</span>
            </div>
          </div>
        </Card>

        <div className="mt-8 flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={() => window.print()}
          >
            <Download className="mr-2 h-4 w-4" />
            Print Ticket
          </Button>
          <Button 
            className="flex-1"
            onClick={() => navigate("/customer")}
          >
            Book Another Ticket
          </Button>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Please save this confirmation for your records.</p>
          <p>Show this at the boarding point.</p>
        </div>
      </div>
    </div>
  );
}