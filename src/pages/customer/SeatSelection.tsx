import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SeatLayout {
  rows: number;
  columns: number;
  seatMap: (string | null)[][];
  seatTypes: { [key: string]: "UP" | "DN" };
}

interface BookingDetail {
  bookingId: number;
  bookingItemId: number;
  seatNo: string;
  amount: number;
  destination: string;
  customerName: string | null;
  phone: string | null;
  agentName: string | null;
  type: string;
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

export default function CustomerSeatSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [bookedSeatsMap, setBookedSeatsMap] = useState<Map<string, BookingDetail>>(new Map());
  const [busInfo, setBusInfo] = useState<any>(null);
  const [layout, setLayout] = useState<SeatLayout | null>(null);
  const [editDialog, setEditDialog] = useState<{ open: boolean; booking: BookingDetail | null }>({
    open: false,
    booking: null,
  });
  const [editForm, setEditForm] = useState({
    customerName: "",
    phone: "",
    destination: "",
    amount: "",
  });

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
      .select("*")
      .eq("id", parseInt(busId!))
      .single();

    if (data) {
      setBusInfo(data);
      // Determine layout based on bus owner
      if (data.owner_name?.toLowerCase().includes("vidhata")) {
        setLayout(busLayouts.vidhata);
      } else if (data.owner_name?.toLowerCase().includes("jagirdar")) {
        setLayout(busLayouts.jagirdar);
      } else {
        // Default layout for other buses
        setLayout(busLayouts.vidhata);
      }
    }
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
        type,
        agent_id,
        booking_items (
          id,
          seat_no,
          amount,
          destination,
          customer_name,
          phone
        ),
        agents (agent_name)
      `)
      .eq("bus_id", parseInt(busId!))
      .eq("route_id", parseInt(routeId!))
      .gte("booking_date", startDate.toISOString())
      .lte("booking_date", endDate.toISOString());

    if (bookings) {
      const seatsMap = new Map<string, BookingDetail>();
      bookings.forEach((booking: any) => {
        booking.booking_items?.forEach((item: any) => {
          if (item.seat_no) {
            seatsMap.set(item.seat_no, {
              bookingId: booking.id,
              bookingItemId: item.id,
              seatNo: item.seat_no,
              amount: parseFloat(item.amount || 0),
              destination: item.destination || "",
              customerName: item.customer_name,
              phone: item.phone,
              agentName: booking.agents?.agent_name || null,
              type: booking.type,
            });
          }
        });
      });
      setBookedSeatsMap(seatsMap);
    }
  };

  const toggleSeat = (seatNo: string) => {
    if (bookedSeatsMap.has(seatNo)) return;

    setSelectedSeats((prev) =>
      prev.includes(seatNo) ? prev.filter((s) => s !== seatNo) : [...prev, seatNo]
    );
  };

  const handleEditBooking = (booking: BookingDetail) => {
    setEditForm({
      customerName: booking.customerName || "",
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
      toast.error("Failed to update booking");
      return;
    }

    toast.success("Booking updated successfully");
    setEditDialog({ open: false, booking: null });
    fetchBookedSeats();
  };

  const handleDeleteBooking = async (booking: BookingDetail) => {
    if (!confirm(`Delete seat ${booking.seatNo}?`)) return;

    const { error } = await supabase
      .from("booking_items")
      .delete()
      .eq("id", booking.bookingItemId);

    if (error) {
      toast.error("Failed to delete booking");
      return;
    }

    toast.success("Booking deleted successfully");
    fetchBookedSeats();
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
      seats: selectedSeats.join(","),
    });
    navigate(`/customer/passenger-details?${params}`);
  };

  if (!busInfo || !layout) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const getColumnHeaders = () => {
    const headers: string[] = [];
    for (let col = 0; col < layout.columns; col++) {
      // Check what type of seat is in this column
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

      <div className="container py-6 max-w-3xl">
        <div className="mb-6 rounded-lg border bg-card p-4">
          <h3 className="font-semibold mb-2">{busInfo.bus_no}</h3>
          <p className="text-sm text-muted-foreground">
            {fromCity} → {toCity} | {format(new Date(dateStr!), "PPP")}
          </p>
        </div>

        {/* Legend */}
        <div className="flex gap-6 mb-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border-2 border-border bg-background"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border-2 border-primary bg-primary text-primary-foreground"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded border-2 border-red-500 bg-red-100 dark:bg-red-950"></div>
            <span>Booked</span>
          </div>
        </div>

        {/* Seat Layout */}
        <div className="rounded-lg border bg-card p-6 mb-6">
          <div className="mb-4 text-center text-sm text-muted-foreground">Driver</div>

          {/* Column Headers */}
          <div className="flex justify-center gap-1 mb-2">
            {getColumnHeaders().map((header, idx) => (
              <div
                key={idx}
                className="w-16 h-8 flex items-center justify-center text-xs font-semibold"
              >
                {header}
              </div>
            ))}
          </div>

          {/* Seat Grid */}
          <div className="space-y-1">
            {layout.seatMap.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-1">
                {row.map((seat, colIndex) => {
                  if (!seat) {
                    return <div key={colIndex} className="w-16 h-16"></div>;
                  }

                  const isBooked = bookedSeatsMap.has(seat);
                  const isSelected = selectedSeats.includes(seat);
                  const bookingDetail = bookedSeatsMap.get(seat);

                  const seatButton = (
                    <button
                      onClick={() => toggleSeat(seat)}
                      disabled={isBooked}
                      className={`
                        w-16 h-16 rounded border-2 text-xs font-medium transition-colors
                        flex flex-col items-center justify-center
                        ${
                          isBooked
                            ? "bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100 border-red-500 cursor-pointer"
                            : isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:bg-accent"
                        }
                      `}
                    >
                      <span className="font-semibold">{seat}</span>
                      {bookingDetail && (
                        <span className="text-[10px] mt-0.5">{bookingDetail.amount}</span>
                      )}
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
                                <h4 className="font-semibold">Seat {bookingDetail.seatNo}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {bookingDetail.type} Booking
                                </p>
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
                              <p>
                                <span className="font-medium">Amount:</span> ₹
                                {bookingDetail.amount}
                              </p>
                              <p>
                                <span className="font-medium">Destination:</span>{" "}
                                {bookingDetail.destination}
                              </p>
                              {bookingDetail.agentName && (
                                <p>
                                  <span className="font-medium">Agent:</span>{" "}
                                  {bookingDetail.agentName}
                                </p>
                              )}
                              {bookingDetail.customerName && (
                                <p>
                                  <span className="font-medium">Customer:</span>{" "}
                                  {bookingDetail.customerName}
                                </p>
                              )}
                              {bookingDetail.phone && (
                                <p>
                                  <span className="font-medium">Phone:</span>{" "}
                                  {bookingDetail.phone}
                                </p>
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

        {/* Footer */}
        {selectedSeats.length > 0 && (
          <div className="sticky bottom-0 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""} selected
                </p>
                <p className="font-semibold">Seats: {selectedSeats.join(", ")}</p>
              </div>
              <Button onClick={handleProceed} size="lg">
                Proceed
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, booking: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Booking - Seat {editDialog.booking?.seatNo}</DialogTitle>
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
}
