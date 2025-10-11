import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils/currency";
import { Loader2, FileText, CheckCircle } from "lucide-react";

interface MemoData {
  route_id: number;
  bus_id: number;
  route_name: string;
  bus_no: string;
  owner_name: string;
  memo_date: string;
  total_booking: number;
  agent_commission: number;
  online_commission: number;
  luggage_commission: number;
  self_commission: number;
  our_profit: number;
  owner_payable: number;
  bookings: any[];
}

interface Memo {
  id: number;
  route_id: number;
  bus_id: number;
  memo_date: string;
  total_booking: number;
  agent_commission: number;
  our_profit: number;
  owner_payable: number;
  status: "PENDING" | "PAID";
  routes: { route_name: string };
  buses: { bus_no: string; owner_name: string };
}

const Memos = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedBus, setSelectedBus] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [previewMemo, setPreviewMemo] = useState<MemoData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchMasters();
    fetchMemos();
  }, []);

  const fetchMasters = async () => {
    const { data: routeData } = await supabase.from("routes").select("*").eq("active", true);
    const { data: busData } = await supabase.from("buses").select("*").eq("active", true);
    if (routeData) setRoutes(routeData);
    if (busData) setBuses(busData);
  };

  const fetchMemos = async () => {
    const { data } = await supabase
      .from("owner_memos")
      .select("*, routes(*), buses(*)")
      .order("memo_date", { ascending: false });
    
    if (data) setMemos(data as Memo[]);
  };

  const calculateMemo = async () => {
    if (!selectedRoute || !selectedBus || !selectedDate) {
      toast({ variant: "destructive", title: "Please select route, bus, and date" });
      return;
    }

    setLoading(true);
    try {
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
          *,
          booking_items (*),
          agents (agent_name)
        `)
        .eq("route_id", parseInt(selectedRoute))
        .eq("bus_id", parseInt(selectedBus))
        .gte("booking_date", startDate.toISOString())
        .lte("booking_date", endDate.toISOString());

      if (error) throw error;

      if (!bookings || bookings.length === 0) {
        toast({ variant: "destructive", title: "No bookings found for this date" });
        setLoading(false);
        return;
      }

      // Calculate totals
      let totalBooking = 0;
      let agentCommission = 0;
      let onlineCommission = 0;
      let luggageCommission = 0;
      let selfCommission = 0;

      bookings.forEach((booking: any) => {
        booking.booking_items.forEach((item: any) => {
          const amount = parseFloat(item.amount);
          totalBooking += amount;

          switch (booking.type) {
            case "AGENT":
              agentCommission += amount * 0.15; // 15% total (10% agent + 5% business)
              break;
            case "ONLINE":
              onlineCommission += amount * 0.05;
              break;
            case "LUGGAGE":
              luggageCommission += amount * 0.35;
              break;
            case "SELF":
              selfCommission += amount * 0.15;
              break;
          }
        });
      });

      const ourProfit = agentCommission + onlineCommission + luggageCommission + selfCommission;
      const ownerPayable = totalBooking - ourProfit;

      const route = routes.find(r => r.id === parseInt(selectedRoute));
      const bus = buses.find(b => b.id === parseInt(selectedBus));

      setPreviewMemo({
        route_id: parseInt(selectedRoute),
        bus_id: parseInt(selectedBus),
        route_name: route?.route_name || "",
        bus_no: bus?.bus_no || "",
        owner_name: bus?.owner_name || "",
        memo_date: selectedDate,
        total_booking: totalBooking,
        agent_commission: agentCommission,
        online_commission: onlineCommission,
        luggage_commission: luggageCommission,
        self_commission: selfCommission,
        our_profit: ourProfit,
        owner_payable: ownerPayable,
        bookings,
      });

      setDialogOpen(true);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const saveMemo = async () => {
    if (!previewMemo) return;

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase.from("owner_memos").insert({
        route_id: previewMemo.route_id,
        bus_id: previewMemo.bus_id,
        memo_date: new Date(previewMemo.memo_date).toISOString(),
        total_booking: previewMemo.total_booking,
        agent_commission: previewMemo.agent_commission,
        our_profit: previewMemo.our_profit,
        owner_payable: previewMemo.owner_payable,
        status: "PENDING",
        created_by: user.user?.id,
      });

      if (error) throw error;

      toast({ title: "Memo saved successfully!" });
      setDialogOpen(false);
      setPreviewMemo(null);
      fetchMemos();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const markMemoPaid = async (id: number) => {
    const { error } = await supabase
      .from("owner_memos")
      .update({ status: "PAID" })
      .eq("id", id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Memo marked as paid!" });
      fetchMemos();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Owner Memos</h1>
        <p className="text-muted-foreground">Generate and manage owner payment memos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate New Memo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Route</Label>
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger>
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={String(route.id)}>
                      {route.route_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bus</Label>
              <Select value={selectedBus} onValueChange={setSelectedBus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((bus) => (
                    <SelectItem key={bus.id} value={String(bus.id)}>
                      {bus.bus_no} - {bus.owner_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={calculateMemo} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Memo
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Memos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Bus</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Total Booking</TableHead>
                <TableHead className="text-right">Owner Payable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memos.map((memo) => (
                <TableRow key={memo.id}>
                  <TableCell>{formatDate(memo.memo_date)}</TableCell>
                  <TableCell>{memo.routes.route_name}</TableCell>
                  <TableCell>{memo.buses.bus_no}</TableCell>
                  <TableCell>{memo.buses.owner_name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(memo.total_booking)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(memo.owner_payable)}
                  </TableCell>
                  <TableCell>
                    {memo.status === "PAID" ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {memo.status === "PENDING" && (
                      <Button size="sm" onClick={() => markMemoPaid(memo.id)}>
                        Mark Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {memos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No memos found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Memo Preview</DialogTitle>
          </DialogHeader>

          {previewMemo && (
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Route:</span>
                    <p className="font-semibold">{previewMemo.route_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bus:</span>
                    <p className="font-semibold">{previewMemo.bus_no}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Owner:</span>
                    <p className="font-semibold">{previewMemo.owner_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="font-semibold">{formatDate(previewMemo.memo_date)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Booking Details</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Seats</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Group bookings by type, destination, and amount
                        const grouped: Record<string, { type: string; seats: string[]; destination: string; perSeatAmount: number; totalAmount: number }> = {};
                        
                        previewMemo.bookings.forEach((booking: any) => {
                          booking.booking_items.forEach((item: any) => {
                            const key = `${booking.type}-${item.destination}-${item.amount}`;
                            if (!grouped[key]) {
                              grouped[key] = {
                                type: booking.type,
                                seats: [],
                                destination: item.destination || "-",
                                perSeatAmount: parseFloat(item.amount),
                                totalAmount: 0
                              };
                            }
                            grouped[key].seats.push(item.seat_no || item.description || "-");
                            grouped[key].totalAmount += parseFloat(item.amount);
                          });
                        });

                        return Object.values(grouped).map((group, idx) => {
                          return (
                            <TableRow key={idx}>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {group.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {group.seats.join(", ")}
                              </TableCell>
                              <TableCell>{group.destination}</TableCell>
                              <TableCell className="text-right">
                                {group.seats.length} seat × {formatCurrency(group.perSeatAmount)} = {formatCurrency(group.totalAmount)}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Financial Summary</h3>
                  <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Total Booking</TableCell>
                      <TableCell className="text-right">{formatCurrency(previewMemo.total_booking)}</TableCell>
                    </TableRow>
                    {previewMemo.agent_commission > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Agent Commission (15% Total - 10% to Agent, 5% Profit)</TableCell>
                        <TableCell className="text-right text-warning">
                          -{formatCurrency(previewMemo.agent_commission)}
                        </TableCell>
                      </TableRow>
                    )}
                    {previewMemo.online_commission > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Online Commission (5%)</TableCell>
                        <TableCell className="text-right text-warning">
                          -{formatCurrency(previewMemo.online_commission)}
                        </TableCell>
                      </TableRow>
                    )}
                    {previewMemo.luggage_commission > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Luggage Commission (35%)</TableCell>
                        <TableCell className="text-right text-warning">
                          -{formatCurrency(previewMemo.luggage_commission)}
                        </TableCell>
                      </TableRow>
                    )}
                    {previewMemo.self_commission > 0 && (
                      <TableRow>
                        <TableCell className="font-medium">Self Commission (15%)</TableCell>
                        <TableCell className="text-right text-warning">
                          -{formatCurrency(previewMemo.self_commission)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="font-medium text-lg">Owner Payable</TableCell>
                      <TableCell className="text-right text-lg font-bold text-primary">
                        {formatCurrency(previewMemo.owner_payable)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveMemo} disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Save Memo
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Memos;
