import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CustomerSeatSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [busInfo, setBusInfo] = useState<any>(null);

  const busId = searchParams.get("busId");
  const routeId = searchParams.get("routeId");
  const dateStr = searchParams.get("date");
  const fromCity = searchParams.get("from");
  const toCity = searchParams.get("to");

  useEffect(() => {
    if (busId && routeId && dateStr) {
      fetchBusInfo();
      fetchBookedSeats();
    }
  }, [busId, routeId, dateStr]);

  const fetchBusInfo = async () => {
    const { data } = await supabase
      .from("buses")
      .select("*, routes!inner(*)")
      .eq("id", parseInt(busId!))
      .single();
    
    if (data) setBusInfo(data);
  };

  const fetchBookedSeats = async () => {
    const startDate = new Date(dateStr!);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateStr!);
    endDate.setHours(23, 59, 59, 999);

    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        id,
        booking_items (seat_no)
      `)
      .eq("bus_id", parseInt(busId!))
      .eq("route_id", parseInt(routeId!))
      .gte("booking_date", startDate.toISOString())
      .lte("booking_date", endDate.toISOString());

    if (bookings) {
      const seats = bookings.flatMap(b => 
        b.booking_items?.map(item => item.seat_no).filter(Boolean) || []
      );
      setBookedSeats(seats as string[]);
    }
  };

  const totalSeats = busInfo?.bus_type === "SEATER" ? 40 : 30;
  const rows = busInfo?.bus_type === "SEATER" ? 10 : 15;
  const seatsPerRow = busInfo?.bus_type === "SEATER" ? 4 : 2;

  const toggleSeat = (seatNo: string) => {
    if (bookedSeats.includes(seatNo)) return;
    
    setSelectedSeats(prev =>
      prev.includes(seatNo)
        ? prev.filter(s => s !== seatNo)
        : [...prev, seatNo]
    );
  };

  const handleProceed = () => {
    if (selectedSeats.length === 0) {
      toast.error("Please select at least one seat");
      return;
    }
    const params = new URLSearchParams({
      busId: busId!,
      routeId: routeId!,
      date: dateStr!,
      from: fromCity!,
      to: toCity!,
      seats: selectedSeats.join(",")
    });
    navigate(`/customer/passenger-details?${params}`);
  };

  if (!busInfo) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Select Seats</span>
          </div>
        </div>
      </header>

      <div className="container py-6 max-w-2xl">
        <div className="mb-6 rounded-lg border bg-card p-4">
          <h3 className="font-semibold mb-2">{busInfo.bus_no}</h3>
          <p className="text-sm text-muted-foreground">
            {fromCity} → {toCity} | {format(new Date(dateStr!), "PPP")}
          </p>
        </div>

        {/* Legend */}
        <div className="flex gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border-2 bg-background"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border-2 bg-primary text-primary-foreground"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border-2 bg-muted text-muted-foreground"></div>
            <span>Booked</span>
          </div>
        </div>

        {/* Seat Layout */}
        <div className="rounded-lg border bg-card p-6 mb-6">
          <div className="mb-4 text-center text-sm text-muted-foreground">Driver</div>
          <div className="space-y-2">
            {Array.from({ length: rows }, (_, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-2">
                {Array.from({ length: seatsPerRow }, (_, seatIndex) => {
                  const seatNo = `${rowIndex + 1}${String.fromCharCode(65 + seatIndex)}`;
                  const isBooked = bookedSeats.includes(seatNo);
                  const isSelected = selectedSeats.includes(seatNo);

                  return (
                    <button
                      key={seatNo}
                      onClick={() => toggleSeat(seatNo)}
                      disabled={isBooked}
                      className={`
                        w-12 h-12 rounded border-2 text-sm font-medium transition-colors
                        ${isBooked 
                          ? "bg-muted text-muted-foreground cursor-not-allowed" 
                          : isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-accent"
                        }
                      `}
                    >
                      {seatNo}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        {selectedSeats.length > 0 && (
          <div className="sticky bottom-0 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""} selected
                </p>
                <p className="font-semibold">
                  Seats: {selectedSeats.join(", ")}
                </p>
              </div>
              <Button onClick={handleProceed} size="lg">
                Proceed
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}