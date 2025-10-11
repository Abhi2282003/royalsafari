import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Agent {
  id: number;
  agent_name: string;
}

interface SeatBooking {
  seat_no: string;
  type: "AGENT" | "ONLINE" | "LUGGAGE" | "SELF";
  agent_id?: string;
  destination: string;
  amount: string;
}

interface BookedSeat {
  seat_no: string;
  type: "AGENT" | "ONLINE" | "LUGGAGE" | "SELF";
  destination: string;
  amount: number;
  agent_name?: string;
}

interface SeatSelectionModeProps {
  busType: "SLEEPER" | "SEATING_SLEEPER";
  agents: Agent[];
  bookingDate: string;
  routeId: number;
  busId: number;
  onBookingComplete: () => void;
}

const SeatSelectionMode = ({ busType, agents, bookingDate, routeId, busId, onBookingComplete }: SeatSelectionModeProps) => {
  const { toast } = useToast();
  const [bookedSeats, setBookedSeats] = useState<Record<string, BookedSeat>>({});
  const [seatBookings, setSeatBookings] = useState<Record<string, SeatBooking>>({});
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [bookingType, setBookingType] = useState<"AGENT" | "ONLINE" | "LUGGAGE" | "SELF">("AGENT");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const totalSeats = busType === "SLEEPER" ? 36 : 50;
  const seatingSeats = busType === "SEATING_SLEEPER" ? 20 : 0;

  useEffect(() => {
    fetchExistingBookings();
  }, [bookingDate, routeId, busId]);

  const fetchExistingBookings = async () => {
    setFetching(true);
    try {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
          id,
          type,
          agent_id,
          booking_items(seat_no, destination, amount),
          agents(agent_name)
        `)
        .eq("route_id", routeId)
        .eq("bus_id", busId)
        .gte("booking_date", new Date(bookingDate).toISOString())
        .lt("booking_date", new Date(new Date(bookingDate).getTime() + 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const seatsMap: Record<string, BookedSeat> = {};
      bookings?.forEach((booking: any) => {
        booking.booking_items?.forEach((item: any) => {
          if (item.seat_no) {
            seatsMap[item.seat_no] = {
              seat_no: item.seat_no,
              type: booking.type,
              destination: item.destination,
              amount: item.amount,
              agent_name: booking.agents?.agent_name,
            };
          }
        });
      });

      setBookedSeats(seatsMap);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error loading seats", description: error.message });
    } finally {
      setFetching(false);
    }
  };

  const getSeatType = (seatNum: number) => {
    if (busType === "SEATING_SLEEPER" && seatNum <= seatingSeats) {
      return "SEATING";
    }
    return "SLEEPER";
  };

  const toggleSeat = (seatNo: string) => {
    // Don't allow selection of already booked seats
    if (bookedSeats[seatNo]) return;

    if (seatBookings[seatNo]) {
      // Remove from current session bookings
      const newBookings = { ...seatBookings };
      delete newBookings[seatNo];
      setSeatBookings(newBookings);
      setSelectedSeats(selectedSeats.filter(s => s !== seatNo));
    } else {
      setSelectedSeats(prev => 
        prev.includes(seatNo) ? prev.filter(s => s !== seatNo) : [...prev, seatNo]
      );
    }
  };

  const assignToSelectedSeats = () => {
    if (!destination || !amount) {
      alert("Please fill in both destination and amount");
      return;
    }
    if (bookingType === "AGENT" && !selectedAgent) {
      alert("Please select an agent");
      return;
    }
    if (selectedSeats.length === 0) {
      alert("Please select at least one seat");
      return;
    }

    const newBookings = { ...seatBookings };
    selectedSeats.forEach(seat => {
      newBookings[seat] = {
        seat_no: seat,
        type: bookingType,
        agent_id: selectedAgent || undefined,
        destination,
        amount,
      };
    });
    setSeatBookings(newBookings);
    setSelectedSeats([]);
    setDestination("");
    setAmount("");
  };

  const handleBookNow = async () => {
    // Merge any currently selected seats
    let merged: Record<string, SeatBooking> = { ...seatBookings };
    if (selectedSeats.length > 0) {
      if (!destination || !amount) {
        toast({ variant: "destructive", title: "Please fill destination and amount for selected seats" });
        return;
      }
      if (bookingType === "AGENT" && !selectedAgent) {
        toast({ variant: "destructive", title: "Please select an agent for AGENT bookings" });
        return;
      }
      selectedSeats.forEach((seat) => {
        merged[seat] = {
          seat_no: seat,
          type: bookingType,
          agent_id: selectedAgent || undefined,
          destination,
          amount,
        };
      });
    }

    const bookings = Object.values(merged);
    if (bookings.length === 0) {
      toast({ variant: "destructive", title: "No seats selected. Please select and assign seats." });
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Group bookings by type and agent
      const groups = bookings.reduce((acc: any, booking) => {
        const key = `${booking.type}-${booking.agent_id || 'none'}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(booking);
        return acc;
      }, {});

      // Create booking for each group
      for (const [key, groupBookings] of Object.entries(groups) as [string, SeatBooking[]][]) {
        const firstBooking = groupBookings[0];
        
        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .insert({
            booking_date: new Date(bookingDate).toISOString(),
            route_id: routeId,
            bus_id: busId,
            type: firstBooking.type,
            agent_id: firstBooking.agent_id ? parseInt(firstBooking.agent_id) : null,
            created_by: user.user.id,
          })
          .select()
          .single();

        if (bookingError) throw bookingError;

        // Insert booking items
        const items = groupBookings.map(b => ({
          booking_id: booking.id,
          seat_no: b.seat_no,
          destination: b.destination,
          qty: 1,
          amount: parseFloat(b.amount),
        }));

        const { error: itemsError } = await supabase
          .from("booking_items")
          .insert(items);

        if (itemsError) throw itemsError;

        // Create agent collection if AGENT booking
        if (firstBooking.type === "AGENT" && firstBooking.agent_id) {
          const totalAmount = groupBookings.reduce((sum, b) => sum + parseFloat(b.amount), 0);
          const agentCommission = totalAmount * 0.10; // Agent gets 10%, business keeps 5%

          await supabase.from("agent_collections").insert({
            agent_id: parseInt(firstBooking.agent_id),
            booking_id: booking.id,
            due_amount: agentCommission,
            paid_amount: 0,
            status: "PENDING",
          });
        }
      }

      toast({ title: `Successfully booked ${bookings.length} seat(s)!` });
      
      // Reset state and refresh
      setSeatBookings({});
      setSelectedSeats([]);
      setDestination("");
      setAmount("");
      await fetchExistingBookings();
      onBookingComplete();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Booking failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getSeatColor = (seatNo: string) => {
    // Already booked (from database)
    if (bookedSeats[seatNo]) {
      const type = bookedSeats[seatNo].type;
      if (type === "AGENT") return "bg-red-500 text-white border-red-600 cursor-not-allowed";
      if (type === "ONLINE") return "bg-blue-500 text-white border-blue-600 cursor-not-allowed";
      if (type === "SELF") return "bg-green-500 text-white border-green-600 cursor-not-allowed";
      return "bg-gray-500 text-white border-gray-600 cursor-not-allowed";
    }
    // Current session bookings
    if (seatBookings[seatNo]) {
      const type = seatBookings[seatNo].type;
      if (type === "AGENT") return "bg-primary text-primary-foreground hover:bg-primary/90 border-primary";
      if (type === "ONLINE") return "bg-secondary text-secondary-foreground hover:bg-secondary/90 border-secondary";
      if (type === "SELF") return "bg-accent text-accent-foreground hover:bg-accent/90 border-accent";
      return "bg-muted text-muted-foreground hover:bg-muted/80 border-muted";
    }
    if (selectedSeats.includes(seatNo)) return "bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500 scale-105";
    return "bg-card border-2 border-border hover:bg-accent/50 hover:border-accent";
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Select Seats ({busType === "SLEEPER" ? "36 Sleeper Seats" : "20 Seating + 30 Sleeper Seats"})
            {Object.keys(bookedSeats).length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({Object.keys(bookedSeats).length} already booked)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2 mb-4 p-4 bg-muted/30 rounded-lg">
            {Array.from({ length: totalSeats }, (_, i) => {
              const seatNo = String(i + 1);
              const seatType = getSeatType(i + 1);
              return (
                <Button
                  key={seatNo}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "relative h-12 w-full min-w-[3rem] font-semibold text-base transition-all",
                    getSeatColor(seatNo)
                  )}
                  onClick={() => toggleSeat(seatNo)}
                  disabled={!!bookedSeats[seatNo]}
                >
                  {seatNo}
                  {busType === "SEATING_SLEEPER" && (
                    <span className="absolute top-1 right-1 text-[10px] font-normal">
                      {seatType === "SEATING" ? "S" : "SL"}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mb-4 p-3 bg-background/50 rounded-md border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-red-500 border-2 border-red-600"></div>
              <span className="text-sm font-medium">Booked (Agent)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-500 border-2 border-blue-600"></div>
              <span className="text-sm font-medium">Booked (Online)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500 border-2 border-green-600"></div>
              <span className="text-sm font-medium">Booked (Self)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-yellow-500 border-2 border-yellow-500"></div>
              <span className="text-sm font-medium">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-card border-2 border-border"></div>
              <span className="text-sm font-medium">Available</span>
            </div>
          </div>

          {selectedSeats.length > 0 && (
            <div className="space-y-4 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary">{selectedSeats.length} seats selected</Badge>
                </div>
                <div className="text-sm font-medium text-foreground">
                  Seats: {selectedSeats.sort((a, b) => parseInt(a) - parseInt(b)).join(", ")}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Booking Type</Label>
                <RadioGroup value={bookingType} onValueChange={(val: any) => setBookingType(val)}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="AGENT" id="agent-seat" />
                      <Label htmlFor="agent-seat">Agent</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ONLINE" id="online-seat" />
                      <Label htmlFor="online-seat">Online</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="SELF" id="self-seat" />
                      <Label htmlFor="self-seat">Self</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {bookingType === "AGENT" && (
                <div className="space-y-2">
                  <Label>Agent</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={String(agent.id)}>
                          {agent.agent_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Destination</Label>
                  <Input
                    placeholder="Enter destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount (per seat)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <Button type="button" onClick={assignToSelectedSeats} className="w-full" size="lg">
                Assign to Selected Seats
              </Button>
            </div>
          )}

          {Object.keys(seatBookings).length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Booked Seats Summary:</h4>
              <div className="space-y-1 text-sm">
                {Object.entries(
                  Object.values(seatBookings).reduce((acc: any, booking) => {
                    const key = `${booking.type}-${booking.destination}-${booking.amount}`;
                    if (!acc[key]) {
                      acc[key] = { ...booking, seats: [] };
                    }
                    acc[key].seats.push(booking.seat_no);
                    return acc;
                  }, {})
                ).map(([key, group]: [string, any]) => (
                  <div key={key} className="flex justify-between items-center p-2 bg-muted rounded">
                    <div>
                      <Badge variant="outline" className="mr-2">{group.type}</Badge>
                      {group.seats.sort((a: string, b: string) => parseInt(a) - parseInt(b)).join(", ")} → {group.destination}
                    </div>
                    <div className="font-semibold">
                      {group.seats.length} × ₹{group.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button 
        type="button"
        onClick={handleBookNow} 
        className="w-full"
        size="lg"
        disabled={Object.keys(seatBookings).length === 0 && selectedSeats.length === 0 || loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Booking...
          </>
        ) : (
          `Book Now (${Object.keys(seatBookings).length + (selectedSeats.length > 0 ? selectedSeats.length : 0)} seats)`
        )}
      </Button>
    </div>
  );
};

export default SeatSelectionMode;
