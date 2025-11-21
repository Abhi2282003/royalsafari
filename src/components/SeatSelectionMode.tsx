import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit, Trash2 } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Agent {
  id: number;
  agent_name: string;
}

interface SeatBooking {
  seat_no: string;
  type: "AGENT" | "ONLINE" | "LUGGAGE" | "SELF";
  agent_id?: string;
  destinations: string[];
  amount: string;
}

interface BookedSeat {
  bookingId: number;
  bookingItemId: number;
  seat_no: string;
  type: "AGENT" | "ONLINE" | "LUGGAGE" | "SELF";
  destination: string;
  amount: number;
  agent_name?: string;
  customer_name?: string;
  phone?: string;
}

interface SeatLayout {
  rows: number;
  columns: number;
  seatMap: (string | null)[][];
  seatTypes: { [key: string]: "UP" | "DN" };
}

const busLayouts: { [key: string]: SeatLayout } = {
  vidhata: {
    rows: 6,
    columns: 7,
    seatMap: [
      ["U16", "L1", null, "L2", "L3", "U17", "U18"],
      ["U19", "L4", null, "L5", "L6", "U20", "U21"],
      ["U22", "L7", null, "L8", "L9", "U23", "U24"],
      ["U25", "L10", null, "L11", "L12", "U26", "U27"],
      ["U28", "L13", null, "L14", "L15", "U29", "U30"],
      ["U34", "L31", null, "L32", "L33", "U35", "U36"],
    ],
    seatTypes: {
      U16: "UP", L1: "DN", L2: "DN", L3: "DN", U17: "UP", U18: "UP",
      U19: "UP", L4: "DN", L5: "DN", L6: "DN", U20: "UP", U21: "UP",
      U22: "UP", L7: "DN", L8: "DN", L9: "DN", U23: "UP", U24: "UP",
      U25: "UP", L10: "DN", L11: "DN", L12: "DN", U26: "UP", U27: "UP",
      U28: "UP", L13: "DN", L14: "DN", L15: "DN", U29: "UP", U30: "UP",
      U34: "UP", L31: "DN", L32: "DN", L33: "DN", U35: "UP", U36: "UP",
    },
  },
  jagirdar: {
    rows: 6,
    columns: 9,
    seatMap: [
      ["6", "5", null, null, null, "1", "2", "3", "4"],
      ["12", "11", null, null, null, "7", "8", "9", "10"],
      ["18", "17", null, null, null, "13", "14", "15", "16"],
      ["24", "23", null, null, null, "19", "20", "21", "22"],
      ["30", "29", null, null, null, "25", "26", "27", "28"],
      ["36", "35", null, null, null, "31", "32", "33", "34"],
    ],
    seatTypes: {
      "6": "UP", "5": "DN", "1": "DN", "2": "DN", "3": "DN", "4": "UP",
      "12": "UP", "11": "DN", "7": "DN", "8": "DN", "9": "DN", "10": "UP",
      "18": "UP", "17": "DN", "13": "DN", "14": "DN", "15": "DN", "16": "UP",
      "24": "UP", "23": "DN", "19": "DN", "20": "DN", "21": "DN", "22": "UP",
      "30": "UP", "29": "DN", "25": "DN", "26": "DN", "27": "DN", "28": "UP",
      "36": "UP", "35": "DN", "31": "DN", "32": "DN", "33": "DN", "34": "UP",
    },
  },
};

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
  const [destination, setDestination] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [destinationOptions, setDestinationOptions] = useState<string[]>([]);
  const [busInfo, setBusInfo] = useState<any>(null);
  const [layout, setLayout] = useState<SeatLayout | null>(null);
  const [editDialog, setEditDialog] = useState<{ open: boolean; booking: BookedSeat | null }>({
    open: false,
    booking: null,
  });
  const [editForm, setEditForm] = useState({
    customerName: "",
    phone: "",
    destination: "",
    amount: "",
  });

  const totalSeats = busType === "SLEEPER" ? 36 : 50;
  const seatingSeats = busType === "SEATING_SLEEPER" ? 20 : 0;

  useEffect(() => {
    fetchBusInfo();
    fetchDestinations();
    fetchExistingBookings();
  }, [bookingDate, routeId, busId]);

  const fetchBusInfo = async () => {
    const { data } = await supabase
      .from("buses")
      .select("*")
      .eq("id", busId)
      .single();

    if (data) {
      setBusInfo(data);
      if (data.owner_name?.toLowerCase().includes("vidhata")) {
        setLayout(busLayouts.vidhata);
      } else if (data.owner_name?.toLowerCase().includes("jagirdar")) {
        setLayout(busLayouts.jagirdar);
      } else {
        setLayout(null);
      }
    }
  };

  const fetchDestinations = async () => {
    const { data } = await supabase
      .from("destinations")
      .select("city_name")
      .eq("active", true)
      .order("city_name");
    
    if (data) {
      setDestinationOptions(data.map(d => d.city_name));
    }
  };

  const fetchExistingBookings = async () => {
    setFetching(true);
    try {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
          id,
          type,
          agent_id,
          booking_items(id, seat_no, destination, amount, customer_name, phone),
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
              bookingId: booking.id,
              bookingItemId: item.id,
              seat_no: item.seat_no,
              type: booking.type,
              destination: item.destination,
              amount: item.amount,
              agent_name: booking.agents?.agent_name,
              customer_name: item.customer_name,
              phone: item.phone,
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

  const handleEditBooking = (booking: BookedSeat) => {
    setEditForm({
      customerName: booking.customer_name || "",
      phone: booking.phone || "",
      destination: booking.destination,
      amount: booking.amount.toString(),
    });
    setEditDialog({ open: true, booking });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.booking) return;

    const { error } = await supabase
      .from("booking_items")
      .update({
        customer_name: editForm.customerName || null,
        phone: editForm.phone || null,
        destination: editForm.destination,
        amount: parseFloat(editForm.amount),
      })
      .eq("id", editDialog.booking.bookingItemId);

    if (error) {
      toast({ variant: "destructive", title: "Failed to update booking", description: error.message });
      return;
    }

    toast({ title: "Booking updated successfully" });
    setEditDialog({ open: false, booking: null });
    fetchExistingBookings();
  };

  const handleDeleteBooking = async (booking: BookedSeat) => {
    if (!confirm(`Delete seat ${booking.seat_no}?`)) return;

    const { error } = await supabase
      .from("booking_items")
      .delete()
      .eq("id", booking.bookingItemId);

    if (error) {
      toast({ variant: "destructive", title: "Failed to delete booking", description: error.message });
      return;
    }

    toast({ title: "Booking deleted successfully" });
    fetchExistingBookings();
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
        destinations: [destination],
        amount,
      };
    });
    setSeatBookings(newBookings);
    setSelectedSeats([]);
    setDestination("");
    setAmount("");
  };

  const saveNewDestinations = async (cities: string[]) => {
    for (const city of cities) {
      const cityCapitalized = city.trim().charAt(0).toUpperCase() + city.trim().slice(1);
      if (!destinationOptions.includes(cityCapitalized)) {
        const { error } = await supabase
          .from("destinations")
          .insert({ city_name: cityCapitalized, active: true });
        
        if (!error) {
          setDestinationOptions(prev => [...prev, cityCapitalized]);
        }
      }
    }
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
          destinations: [destination],
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
          destination: b.destinations.join(", "),
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
          const amountToCollect = totalAmount * 0.90; // Collect 90% from agent (they keep 10%)

          await supabase.from("agent_collections").insert({
            agent_id: parseInt(firstBooking.agent_id),
            booking_id: booking.id,
            due_amount: amountToCollect,
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
    if (bookedSeats[seatNo]) {
      const type = bookedSeats[seatNo].type;
      if (type === "AGENT") return "bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100 border-red-500 cursor-pointer";
      if (type === "ONLINE") return "bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border-blue-500 cursor-pointer";
      if (type === "SELF") return "bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-100 border-green-500 cursor-pointer";
      return "bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-500 cursor-pointer";
    }
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

  const getColumnHeaders = () => {
    if (!layout) return [];
    const headers: string[] = [];
    for (let col = 0; col < layout.columns; col++) {
      let headerType = "";
      for (let row = 0; row < layout.rows; row++) {
        const seat = layout.seatMap[row][col];
        if (seat && layout.seatTypes[seat]) {
          headerType = layout.seatTypes[seat];
          break;
        }
      }
      headers.push(headerType || "");
    }
    return headers;
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
          {layout ? (
            // Custom Layout
            <div className="mb-4 overflow-x-auto">
              <div className="mb-3 text-center text-xs md:text-sm text-muted-foreground">Driver</div>

              {/* Column Headers */}
              <div className="flex justify-center gap-0.5 md:gap-1 mb-1 md:mb-2 min-w-max">
                {getColumnHeaders().map((header, idx) => (
                  <div key={idx} className="w-12 md:w-16 h-6 md:h-8 flex items-center justify-center text-[10px] md:text-xs font-semibold">
                    {header}
                  </div>
                ))}
              </div>

              {/* Seat Grid */}
              <div className="space-y-0.5 md:space-y-1 min-w-max">
                {layout.seatMap.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex justify-center gap-0.5 md:gap-1">
                    {row.map((seat, colIndex) => {
                      if (!seat) return <div key={colIndex} className="w-12 md:w-16 h-12 md:h-16"></div>;

                      const isBooked = !!bookedSeats[seat];
                      const bookingDetail = bookedSeats[seat];

                      const seatButton = (
                        <button
                          onClick={() => toggleSeat(seat)}
                          disabled={isBooked && !bookingDetail}
                          className={cn(
                            "w-12 md:w-16 h-12 md:h-16 rounded border-2 text-[10px] md:text-xs font-medium transition-all",
                            "flex flex-col items-center justify-center",
                            getSeatColor(seat)
                          )}
                        >
                          <span className="font-semibold">{seat}</span>
                          {bookingDetail && <span className="text-[8px] md:text-[10px] mt-0.5">₹{bookingDetail.amount}</span>}
                        </button>
                      );

                      if (isBooked && bookingDetail) {
                        return (
                          <HoverCard key={colIndex} openDelay={200}>
                            <HoverCardTrigger asChild>{seatButton}</HoverCardTrigger>
                            <HoverCardContent className="w-80" side="top">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-semibold">Seat {bookingDetail.seat_no}</h4>
                                    <p className="text-sm text-muted-foreground">{bookingDetail.type} Booking</p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditBooking(bookingDetail);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteBooking(bookingDetail);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="text-sm space-y-1">
                                  <p><span className="font-medium">Amount:</span> ₹{bookingDetail.amount}</p>
                                  <p><span className="font-medium">Destination:</span> {bookingDetail.destination}</p>
                                  {bookingDetail.agent_name && (
                                    <p><span className="font-medium">Agent:</span> {bookingDetail.agent_name}</p>
                                  )}
                                  {bookingDetail.customer_name && (
                                    <p><span className="font-medium">Customer:</span> {bookingDetail.customer_name}</p>
                                  )}
                                  {bookingDetail.phone && (
                                    <p><span className="font-medium">Phone:</span> {bookingDetail.phone}</p>
                                  )}
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        );
                      }

                      return <div key={colIndex}>{seatButton}</div>;
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Default Grid Layout
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2 mb-4 p-4 bg-muted/30 rounded-lg">
              {Array.from({ length: totalSeats }, (_, i) => {
                const seatNo = String(i + 1);
                const seatType = getSeatType(i + 1);
                const isBooked = !!bookedSeats[seatNo];
                const bookingDetail = bookedSeats[seatNo];

                const seatButton = (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "relative h-12 w-full min-w-[3rem] font-semibold text-base transition-all",
                      getSeatColor(seatNo)
                    )}
                    onClick={() => toggleSeat(seatNo)}
                    disabled={isBooked && !bookingDetail}
                  >
                    {seatNo}
                    {busType === "SEATING_SLEEPER" && (
                      <span className="absolute top-1 right-1 text-[10px] font-normal">
                        {seatType === "SEATING" ? "S" : "SL"}
                      </span>
                    )}
                  </Button>
                );

                if (isBooked && bookingDetail) {
                  return (
                    <HoverCard key={seatNo} openDelay={200}>
                      <HoverCardTrigger asChild>{seatButton}</HoverCardTrigger>
                      <HoverCardContent className="w-80" side="top">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">Seat {bookingDetail.seat_no}</h4>
                              <p className="text-sm text-muted-foreground">{bookingDetail.type} Booking</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditBooking(bookingDetail);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBooking(bookingDetail);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Amount:</span> ₹{bookingDetail.amount}</p>
                            <p><span className="font-medium">Destination:</span> {bookingDetail.destination}</p>
                            {bookingDetail.agent_name && (
                              <p><span className="font-medium">Agent:</span> {bookingDetail.agent_name}</p>
                            )}
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                }

                return seatButton;
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2 md:gap-3 mb-4 p-2 md:p-3 bg-background/50 rounded-md border">
            <div className="flex items-center gap-1 md:gap-2">
              <div className="w-4 h-4 md:w-6 md:h-6 rounded bg-red-100 dark:bg-red-950 border-2 border-red-500"></div>
              <span className="text-xs md:text-sm font-medium">Agent</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <div className="w-4 h-4 md:w-6 md:h-6 rounded bg-blue-100 dark:bg-blue-950 border-2 border-blue-500"></div>
              <span className="text-xs md:text-sm font-medium">Online</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <div className="w-4 h-4 md:w-6 md:h-6 rounded bg-green-100 dark:bg-green-950 border-2 border-green-500"></div>
              <span className="text-xs md:text-sm font-medium">Self</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <div className="w-4 h-4 md:w-6 md:h-6 rounded bg-yellow-500 border-2 border-yellow-500"></div>
              <span className="text-xs md:text-sm font-medium">Selected</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <div className="w-4 h-4 md:w-6 md:h-6 rounded bg-card border-2 border-border"></div>
              <span className="text-xs md:text-sm font-medium">Available</span>
            </div>
          </div>

          {selectedSeats.length > 0 && (
            <div className="space-y-3 md:space-y-4 p-3 md:p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-xs">{selectedSeats.length} seats</Badge>
                </div>
                <div className="text-xs md:text-sm font-medium text-foreground break-words">
                  Seats: {selectedSeats.sort((a, b) => parseInt(a) - parseInt(b)).join(", ")}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs md:text-sm">Booking Type</Label>
                <RadioGroup value={bookingType} onValueChange={(val: any) => setBookingType(val)}>
                  <div className="flex flex-wrap gap-3 md:gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="AGENT" id="agent-seat" />
                      <Label htmlFor="agent-seat" className="text-xs md:text-sm">Agent</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ONLINE" id="online-seat" />
                      <Label htmlFor="online-seat" className="text-xs md:text-sm">Online</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="SELF" id="self-seat" />
                      <Label htmlFor="self-seat" className="text-xs md:text-sm">Self</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {bookingType === "AGENT" && (
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm">Agent</Label>
                  <Combobox
                    options={agents.map((agent) => ({
                      value: String(agent.id),
                      label: agent.agent_name,
                    }))}
                    value={selectedAgent}
                    onValueChange={setSelectedAgent}
                    placeholder="Search agent..."
                    emptyMessage="No agent found."
                    searchPlaceholder="Search agents..."
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs md:text-sm">Destination City</Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger className="text-xs md:text-sm">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationOptions.map((city) => (
                      <SelectItem key={city} value={city} className="text-xs md:text-sm">
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs md:text-sm">Amount (per seat)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-xs md:text-sm"
                />
              </div>

              <Button type="button" onClick={assignToSelectedSeats} className="w-full text-xs md:text-sm" size="lg">
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
                    const key = `${booking.type}-${booking.destinations.join(",")}-${booking.amount}`;
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
                      {group.seats.sort((a: string, b: string) => parseInt(a) - parseInt(b)).join(", ")} → {group.destinations.join(", ")}
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

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, booking: null })}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Booking - Seat {editDialog.booking?.seat_no}</DialogTitle>
          <DialogDescription>Update the booking details below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              value={editForm.customerName}
              onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              value={editForm.destination}
              onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              value={editForm.amount}
              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditDialog({ open: false, booking: null })}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
};

export default SeatSelectionMode;
