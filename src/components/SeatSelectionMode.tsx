import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

interface SeatSelectionModeProps {
  busType: "SLEEPER" | "SEATING_SLEEPER";
  agents: Agent[];
  onComplete: (bookings: SeatBooking[]) => void;
}

const SeatSelectionMode = ({ busType, agents, onComplete }: SeatSelectionModeProps) => {
  const [seatBookings, setSeatBookings] = useState<Record<string, SeatBooking>>({});
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [bookingType, setBookingType] = useState<"AGENT" | "ONLINE" | "LUGGAGE" | "SELF">("AGENT");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");

  const totalSeats = busType === "SLEEPER" ? 36 : 50;
  const seatingSeats = busType === "SEATING_SLEEPER" ? 20 : 0;

  const getSeatType = (seatNum: number) => {
    if (busType === "SEATING_SLEEPER" && seatNum <= seatingSeats) {
      return "SEATING";
    }
    return "SLEEPER";
  };

  const toggleSeat = (seatNo: string) => {
    if (seatBookings[seatNo]) {
      // Remove booking
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

  const handleComplete = () => {
    // Merge any currently selected seats (if details are filled) so users don't lose progress
    let merged: Record<string, SeatBooking> = { ...seatBookings };
    if (selectedSeats.length > 0) {
      if (!destination || !amount) {
        alert("Please fill destination and amount for the selected seats before applying.");
        return;
      }
      if (bookingType === "AGENT" && !selectedAgent) {
        alert("Please select an agent for AGENT bookings.");
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
      alert("No seats assigned. Select seats, fill details, then click Apply.");
      return;
    }

    // Update local state so summary reflects the merged seats, then notify parent
    setSeatBookings(merged);
    setSelectedSeats([]);
    setDestination("");
    setAmount("");

    onComplete(bookings);
  };

  const getSeatColor = (seatNo: string) => {
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Seats ({busType === "SLEEPER" ? "36 Sleeper Seats" : "20 Seating + 30 Sleeper Seats"})</CardTitle>
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
              <div className="w-6 h-6 rounded bg-primary border-2 border-primary"></div>
              <span className="text-sm font-medium">Agent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-secondary border-2 border-secondary"></div>
              <span className="text-sm font-medium">Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-accent border-2 border-accent"></div>
              <span className="text-sm font-medium">Self</span>
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
        onClick={handleComplete} 
        className="w-full"
        size="lg"
        disabled={Object.keys(seatBookings).length === 0}
      >
        Apply Seat Selection ({Object.keys(seatBookings).length} seats)
      </Button>
    </div>
  );
};

export default SeatSelectionMode;
