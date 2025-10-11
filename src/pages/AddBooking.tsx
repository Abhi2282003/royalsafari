import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils/currency";
import { Plus, Trash2, Loader2 } from "lucide-react";
import SeatSelectionMode from "@/components/SeatSelectionMode";

interface RouteBus {
  id: number;
  route_id: number;
  bus_id: number;
  routes: { id: number; route_name: string };
  buses: { id: number; bus_no: string; owner_name: string; bus_type: "SLEEPER" | "SEATING_SLEEPER" };
}

interface Agent {
  id: number;
  agent_name: string;
}

interface BookingItem {
  seat_no?: string;
  description?: string;
  destination?: string;
  qty: number;
  amount: string;
}

interface BookingEntry {
  id: string;
  selectedRouteBus: string;
  bookingType: string;
  selectedAgent: string;
  items: BookingItem[];
  entryMode: "manual" | "seat-selection";
}

const AddBooking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [routeBuses, setRouteBuses] = useState<RouteBus[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingEntries, setBookingEntries] = useState<BookingEntry[]>([
    { id: "1", selectedRouteBus: "", bookingType: "AGENT", selectedAgent: "", items: [], entryMode: "manual" }
  ]);
  
  const [quickSeats, setQuickSeats] = useState("");
  const [quickAmount, setQuickAmount] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: rbData } = await supabase
      .from("route_buses")
      .select("*, routes(*), buses(*)")
      .eq("active", true);
    
    const { data: agentData } = await supabase
      .from("agents")
      .select("*")
      .eq("active", true);
    
    if (rbData) setRouteBuses(rbData as RouteBus[]);
    if (agentData) setAgents(agentData);
  };

  const addBookingEntry = () => {
    setBookingEntries([
      ...bookingEntries,
      { id: Date.now().toString(), selectedRouteBus: "", bookingType: "AGENT", selectedAgent: "", items: [], entryMode: "manual" }
    ]);
  };

  const removeBookingEntry = (id: string) => {
    setBookingEntries(bookingEntries.filter(e => e.id !== id));
  };

  const updateBookingEntry = (id: string, field: keyof BookingEntry, value: any) => {
    setBookingEntries(bookingEntries.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const addItem = (entryId: string) => {
    const entry = bookingEntries.find(e => e.id === entryId);
    if (!entry) return;
    
    const newItem = entry.bookingType === "LUGGAGE" 
      ? { description: "", destination: "", qty: 1, amount: "" }
      : { seat_no: "", destination: "", qty: 1, amount: "" };
    
    updateBookingEntry(entryId, "items", [...entry.items, newItem]);
  };

  const removeItem = (entryId: string, index: number) => {
    const entry = bookingEntries.find(e => e.id === entryId);
    if (!entry) return;
    updateBookingEntry(entryId, "items", entry.items.filter((_, i) => i !== index));
  };

  const updateItem = (entryId: string, index: number, field: keyof BookingItem, value: any) => {
    const entry = bookingEntries.find(e => e.id === entryId);
    if (!entry) return;
    const newItems = [...entry.items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateBookingEntry(entryId, "items", newItems);
  };

  const handleQuickAdd = (entryId: string) => {
    if (!quickSeats || !quickAmount) return;
    
    const entry = bookingEntries.find(e => e.id === entryId);
    if (!entry) return;
    
    const seatNumbers = quickSeats.split(',').map(s => s.trim()).filter(s => s);
    const newItems = seatNumbers.map(seat => ({
      seat_no: seat,
      destination: "",
      qty: 1,
      amount: quickAmount
    }));
    
    updateBookingEntry(entryId, "items", [...entry.items, ...newItems]);
    setQuickSeats("");
    setQuickAmount("");
  };

  const calculateTotals = () => {
    let totalBooking = 0;
    let agentCommission = 0;
    let ourProfit = 0;
    let ownerShare = 0;

    bookingEntries.forEach(entry => {
      entry.items.forEach(item => {
        const amount = parseFloat(item.amount) || 0;
        totalBooking += amount;

        switch (entry.bookingType) {
          case "AGENT":
            agentCommission += amount * 0.10;
            ourProfit += amount * 0.05;
            ownerShare += amount * 0.85;
            break;
          case "ONLINE":
            ourProfit += amount * 0.05;
            ownerShare += amount * 0.95;
            break;
          case "LUGGAGE":
            ourProfit += amount * 0.35;
            ownerShare += amount * 0.65;
            break;
          case "SELF":
            ourProfit += amount * 0.15;
            ownerShare += amount * 0.85;
            break;
        }
      });
    });

    return { totalBooking, agentCommission, ourProfit, ownerShare };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all entries
    for (const entry of bookingEntries) {
      if (!entry.selectedRouteBus) {
        toast({ variant: "destructive", title: "Please select route and bus for all entries" });
        return;
      }
      if (entry.bookingType === "AGENT" && !entry.selectedAgent) {
        toast({ variant: "destructive", title: "Please select agent for all agent bookings" });
        return;
      }
      if (entry.items.length === 0 || entry.items.every(item => !item.amount)) {
        toast({ variant: "destructive", title: "Please add items for all entries" });
        return;
      }
    }

    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();

      // Process each booking entry
      for (const entry of bookingEntries) {
        const [routeId, busId] = entry.selectedRouteBus.split("-").map(Number);

        // Insert booking
        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .insert([{
            booking_date: new Date(bookingDate).toISOString(),
            route_id: routeId,
            bus_id: busId,
            type: entry.bookingType as "AGENT" | "ONLINE" | "LUGGAGE" | "SELF",
            agent_id: entry.selectedAgent ? parseInt(entry.selectedAgent) : null,
            created_by: user.user?.id!,
          }])
          .select()
          .single();

        if (bookingError) throw bookingError;

        // Insert booking items
        const itemsToInsert = entry.items.map(item => ({
          booking_id: booking.id,
          seat_no: item.seat_no || null,
          description: item.description || null,
          destination: item.destination || null,
          qty: item.qty,
          amount: parseFloat(item.amount),
        }));

        const { error: itemsError } = await supabase
          .from("booking_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        // If AGENT booking, create collection
        if (entry.bookingType === "AGENT" && entry.selectedAgent) {
          let entryTotal = 0;
          entry.items.forEach(item => {
            entryTotal += parseFloat(item.amount) || 0;
          });
          const agentComm = entryTotal * 0.10;
          const dueAmount = entryTotal - agentComm;

          await supabase.from("agent_collections").insert({
            agent_id: parseInt(entry.selectedAgent),
            booking_id: booking.id,
            due_amount: dueAmount,
            paid_amount: 0,
            status: "PENDING",
          });
        }
      }

      toast({ title: `${bookingEntries.length} booking(s) created successfully!` });
      navigate("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Booking</h1>
        <p className="text-muted-foreground">Create booking entries (can add multiple routes at once)</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Booking Date</Label>
            <Input
              id="date"
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              required
            />
          </div>

          {bookingEntries.map((entry, entryIndex) => (
            <Card key={entry.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Booking #{entryIndex + 1}</CardTitle>
                  {bookingEntries.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBookingEntry(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Route | Bus | Owner</Label>
                  <Select 
                    value={entry.selectedRouteBus} 
                    onValueChange={(val) => updateBookingEntry(entry.id, "selectedRouteBus", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select route and bus" />
                    </SelectTrigger>
                    <SelectContent>
                      {routeBuses.map((rb) => (
                        <SelectItem key={rb.id} value={`${rb.route_id}-${rb.bus_id}`}>
                          {rb.routes.route_name} | {rb.buses.bus_no} | {rb.buses.owner_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Tabs value={entry.entryMode} onValueChange={(val: any) => updateBookingEntry(entry.id, "entryMode", val)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="seat-selection">Seat Selection</TabsTrigger>
                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="seat-selection" className="mt-4">
                    {entry.selectedRouteBus ? (
                      <SeatSelectionMode
                        busType={routeBuses.find(rb => `${rb.route_id}-${rb.bus_id}` === entry.selectedRouteBus)?.buses.bus_type || "SLEEPER"}
                        agents={agents}
                        onComplete={(bookings) => {
                          console.log("AddBooking - onComplete received bookings:", bookings);
                          const items = bookings.map(b => ({
                            seat_no: b.seat_no,
                            destination: b.destination,
                            qty: 1,
                            amount: b.amount,
                          }));
                          console.log("AddBooking - mapped items:", items);
                          updateBookingEntry(entry.id, "items", items);
                          console.log("AddBooking - items updated for entry:", entry.id);
                          const typeCount = bookings.reduce((acc: any, b) => {
                            acc[b.type] = (acc[b.type] || 0) + 1;
                            return acc;
                          }, {});
                          const majorityType = Object.keys(typeCount).sort((a, b) => typeCount[b] - typeCount[a])[0];
                          console.log("AddBooking - majority type:", majorityType);
                          updateBookingEntry(entry.id, "bookingType", majorityType);
                          const agentBooking = bookings.find(b => b.type === "AGENT");
                          if (agentBooking?.agent_id) {
                            console.log("AddBooking - setting agent:", agentBooking.agent_id);
                            updateBookingEntry(entry.id, "selectedAgent", agentBooking.agent_id);
                          }
                          console.log("AddBooking - onComplete finished");
                        }}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Please select a route and bus first
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="manual" className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Booking Type</Label>
                      <RadioGroup 
                        value={entry.bookingType} 
                        onValueChange={(val) => updateBookingEntry(entry.id, "bookingType", val)}
                      >
                        <div className="grid grid-cols-4 gap-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="AGENT" id={`agent-${entry.id}`} />
                            <Label htmlFor={`agent-${entry.id}`}>Agent</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="ONLINE" id={`online-${entry.id}`} />
                            <Label htmlFor={`online-${entry.id}`}>Online</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="LUGGAGE" id={`luggage-${entry.id}`} />
                            <Label htmlFor={`luggage-${entry.id}`}>Luggage</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="SELF" id={`self-${entry.id}`} />
                            <Label htmlFor={`self-${entry.id}`}>Self</Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    {entry.bookingType === "AGENT" && (
                      <div className="space-y-2">
                        <Label>Agent</Label>
                        <Select 
                          value={entry.selectedAgent} 
                          onValueChange={(val) => updateBookingEntry(entry.id, "selectedAgent", val)}
                        >
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

                    {entry.bookingType !== "LUGGAGE" && (
                      <div className="space-y-2">
                        <Label>Quick Add Seats</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="7,8,9"
                            value={quickSeats}
                            onChange={(e) => setQuickSeats(e.target.value)}
                          />
                          <Input
                            placeholder="Amount"
                            type="number"
                            value={quickAmount}
                            onChange={(e) => setQuickAmount(e.target.value)}
                          />
                          <Button type="button" onClick={() => handleQuickAdd(entry.id)} variant="outline">
                            Add
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Items</Label>
                        <Button type="button" onClick={() => addItem(entry.id)} size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Row
                        </Button>
                      </div>

                      {entry.items.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No items added yet
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {entry.items.map((item, index) => (
                            <div key={index} className="flex gap-2">
                              {entry.bookingType === "LUGGAGE" ? (
                                <Input
                                  placeholder="Description"
                                  value={item.description}
                                  onChange={(e) => updateItem(entry.id, index, "description", e.target.value)}
                                  required
                                  className="flex-1"
                                />
                              ) : (
                                <Input
                                  placeholder="Seat"
                                  value={item.seat_no}
                                  onChange={(e) => updateItem(entry.id, index, "seat_no", e.target.value)}
                                  required
                                  className="w-20"
                                />
                              )}
                              <Input
                                placeholder="Destination"
                                value={item.destination}
                                onChange={(e) => updateItem(entry.id, index, "destination", e.target.value)}
                                required
                                className="flex-1"
                              />
                              <Input
                                placeholder="Amount"
                                type="number"
                                value={item.amount}
                                onChange={(e) => updateItem(entry.id, index, "amount", e.target.value)}
                                required
                                className="w-28"
                              />
                              <Button
                                type="button"
                                onClick={() => removeItem(entry.id, index)}
                                size="icon"
                                variant="ghost"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}

          <Button type="button" onClick={addBookingEntry} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Another Booking Entry
          </Button>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              `Complete ${bookingEntries.length} Booking(s)`
            )}
          </Button>
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Total Booking</span>
                <span className="font-semibold">{formatCurrency(totals.totalBooking)}</span>
              </div>
              
              {totals.agentCommission > 0 && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Agent Commission (10%)</span>
                  <span className="font-semibold text-warning">
                    {formatCurrency(totals.agentCommission)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Our Profit</span>
                <span className="font-semibold text-success">
                  {formatCurrency(totals.ourProfit)}
                </span>
              </div>
              
              <div className="flex justify-between pt-2">
                <span className="font-medium">Owner Share</span>
                <span className="font-bold text-primary">
                  {formatCurrency(totals.ownerShare)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default AddBooking;