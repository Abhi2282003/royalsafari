import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils/currency";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface RouteBus {
  id: number;
  route_id: number;
  bus_id: number;
  routes: { id: number; route_name: string };
  buses: { id: number; bus_no: string; owner_name: string };
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

const AddBooking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [routeBuses, setRouteBuses] = useState<RouteBus[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRouteBus, setSelectedRouteBus] = useState<string>("");
  const [bookingType, setBookingType] = useState<string>("AGENT");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [items, setItems] = useState<BookingItem[]>([]);
  
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

  const addItem = () => {
    if (bookingType === "LUGGAGE") {
      setItems([...items, { description: "", destination: "", qty: 1, amount: "" }]);
    } else {
      setItems([...items, { seat_no: "", destination: "", qty: 1, amount: "" }]);
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BookingItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleQuickAdd = () => {
    if (!quickSeats || !quickAmount) return;
    
    const seatNumbers = quickSeats.split(',').map(s => s.trim()).filter(s => s);
    const newItems = seatNumbers.map(seat => ({
      seat_no: seat,
      destination: "",
      qty: 1,
      amount: quickAmount
    }));
    
    setItems([...items, ...newItems]);
    setQuickSeats("");
    setQuickAmount("");
  };

  const calculateTotals = () => {
    let totalBooking = 0;
    let agentCommission = 0;
    let ourProfit = 0;
    let ownerShare = 0;

    items.forEach(item => {
      const amount = parseFloat(item.amount) || 0;
      totalBooking += amount;

      switch (bookingType) {
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

    return { totalBooking, agentCommission, ourProfit, ownerShare };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRouteBus) {
      toast({ variant: "destructive", title: "Please select a route and bus" });
      return;
    }

    if (bookingType === "AGENT" && !selectedAgent) {
      toast({ variant: "destructive", title: "Please select an agent" });
      return;
    }

    if (items.length === 0 || items.every(item => !item.amount)) {
      toast({ variant: "destructive", title: "Please add at least one item" });
      return;
    }

    setLoading(true);

    try {
      const [routeId, busId] = selectedRouteBus.split("-").map(Number);
      const { data: user } = await supabase.auth.getUser();

      // Insert booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert([{
          booking_date: new Date(bookingDate).toISOString(),
          route_id: routeId,
          bus_id: busId,
          type: bookingType as "AGENT" | "ONLINE" | "LUGGAGE" | "SELF",
          agent_id: selectedAgent ? parseInt(selectedAgent) : null,
          created_by: user.user?.id!,
        }])
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Insert booking items
      const itemsToInsert = items.map(item => ({
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
      if (bookingType === "AGENT" && selectedAgent) {
        const totals = calculateTotals();
        const dueAmount = totals.totalBooking - totals.agentCommission;

        await supabase.from("agent_collections").insert({
          agent_id: parseInt(selectedAgent),
          booking_id: booking.id,
          due_amount: dueAmount,
          paid_amount: 0,
          status: "PENDING",
        });
      }

      toast({ title: "Booking created successfully!" });
      navigate("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();
  const selectedRB = routeBuses.find(rb => `${rb.route_id}-${rb.bus_id}` === selectedRouteBus);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Booking</h1>
        <p className="text-muted-foreground">Create a new booking entry</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="routeBus">Route | Bus | Owner</Label>
                    <Select value={selectedRouteBus} onValueChange={setSelectedRouteBus} required>
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
                </div>

                {selectedRB && (
                  <div className="rounded-lg bg-secondary p-3 text-sm">
                    <span className="font-medium">Owner:</span> {selectedRB.buses.owner_name}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Booking Type</Label>
                  <RadioGroup value={bookingType} onValueChange={setBookingType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="AGENT" id="agent" />
                      <Label htmlFor="agent">Agent</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ONLINE" id="online" />
                      <Label htmlFor="online">Online</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="LUGGAGE" id="luggage" />
                      <Label htmlFor="luggage">Luggage</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="SELF" id="self" />
                      <Label htmlFor="self">Self</Label>
                    </div>
                  </RadioGroup>
                </div>

                {bookingType === "AGENT" && (
                  <div className="space-y-2">
                    <Label htmlFor="agent">Agent</Label>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent} required>
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

                {bookingType !== "LUGGAGE" && (
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
                      <Button type="button" onClick={handleQuickAdd} variant="outline">
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Items</Label>
                    <Button type="button" onClick={addItem} size="sm" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Row
                    </Button>
                  </div>

                  {items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No items added yet. Click "Add Row" to add items.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item, index) => (
                        <div key={index} className="flex gap-2">
                          {bookingType === "LUGGAGE" ? (
                            <Input
                              placeholder="Description"
                              value={item.description}
                              onChange={(e) => updateItem(index, "description", e.target.value)}
                              required
                              className="flex-1"
                            />
                          ) : (
                            <Input
                              placeholder="Seat No"
                              value={item.seat_no}
                              onChange={(e) => updateItem(index, "seat_no", e.target.value)}
                              required
                              className="w-24"
                            />
                          )}
                          <Input
                            placeholder="Destination"
                            value={item.destination}
                            onChange={(e) => updateItem(index, "destination", e.target.value)}
                            required
                            className="flex-1"
                          />
                          <Input
                            placeholder="Amount"
                            type="number"
                            value={item.amount}
                            onChange={(e) => updateItem(index, "amount", e.target.value)}
                            required
                            className="w-32"
                          />
                          <Button
                            type="button"
                            onClick={() => removeItem(index)}
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

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Booking"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
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
              
              {bookingType === "AGENT" && (
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
      </div>
    </div>
  );
};

export default AddBooking;
