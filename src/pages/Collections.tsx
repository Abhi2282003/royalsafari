import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils/currency";
import { Loader2, CheckCircle, Banknote } from "lucide-react";

interface Collection {
  id: number;
  agent_id: number;
  booking_id: number;
  due_amount: string;
  paid_amount: string;
  status: "PENDING" | "PAID";
  paid_on: string | null;
  agents: {
    agent_name: string;
  };
  bookings: {
    booking_date: string;
    routes: {
      route_name: string;
    };
    buses: {
      bus_no: string;
    };
  };
}

interface AgentSummary {
  agent_id: number;
  agent_name: string;
  bookings_count: number;
  total_due: number;
  total_paid: number;
  all_collections: Collection[];
}

const Collections = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [agentSummaries, setAgentSummaries] = useState<AgentSummary[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from("agent_collections")
        .select(`
          *,
          agents (agent_name),
          bookings (
            booking_date,
            routes (route_name),
            buses (bus_no),
            booking_items (amount)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by agent
      const agentMap = new Map<number, AgentSummary>();
      
      data?.forEach((collection: any) => {
        const agentId = collection.agent_id;
        if (!agentMap.has(agentId)) {
          agentMap.set(agentId, {
            agent_id: agentId,
            agent_name: collection.agents.agent_name,
            bookings_count: 0,
            total_due: 0,
            total_paid: 0,
            all_collections: [],
          });
        }

        const summary = agentMap.get(agentId)!;
        summary.bookings_count++;
        summary.total_due += parseFloat(collection.due_amount);
        summary.total_paid += parseFloat(collection.paid_amount);
        summary.all_collections.push(collection);
      });

      setAgentSummaries(Array.from(agentMap.values()));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (collectionId: number) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({ variant: "destructive", title: "Please enter a valid amount" });
      return;
    }

    setProcessing(true);
    try {
      // Get the current collection to access its existing paid_amount and due_amount
      const { data: collection, error: fetchError } = await supabase
        .from("agent_collections")
        .select("paid_amount, due_amount")
        .eq("id", collectionId)
        .single();

      if (fetchError) throw fetchError;

      const currentPaid = parseFloat(collection.paid_amount.toString());
      const due = parseFloat(collection.due_amount.toString());
      const amount = parseFloat(paymentAmount);
      const remaining = Math.max(due - currentPaid, 0);

      if (amount > remaining) {
        toast({ 
          variant: "destructive", 
          title: "Amount exceeds remaining due", 
          description: `Remaining: ${formatCurrency(remaining)}`
        });
        setProcessing(false);
        return;
      }

      const newPaidAmount = currentPaid + amount;

      const { error } = await supabase
        .from("agent_collections")
        .update({
          paid_amount: newPaidAmount,
          status: newPaidAmount >= due ? "PAID" : "PENDING",
          paid_on: newPaidAmount >= due ? new Date().toISOString() : null,
        })
        .eq("id", collectionId);

      if (error) throw error;

      toast({ title: "Payment recorded successfully!" });
      setDialogOpen(false);
      setPaymentAmount("");
      fetchCollections();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const openPaymentDialog = (agent: AgentSummary) => {
    setSelectedAgent(agent);
    setPaymentAmount("");
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPendingAmount = agentSummaries.reduce((sum, agent) => {
    return sum + agent.all_collections.reduce((agentSum, c) => {
      if (c.status === 'PENDING') {
        return agentSum + Math.max(parseFloat((c as any).due_amount?.toString?.() ?? `${(c as any).due_amount}`) - parseFloat((c as any).paid_amount?.toString?.() ?? `${(c as any).paid_amount}`), 0);
      }
      return agentSum;
    }, 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agent Collections</h1>
        <p className="text-muted-foreground">Track and manage agent payment collections</p>
      </div>

      <Card className="border-warning/20 bg-warning/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Pending Collection Amount</p>
              <p className="text-3xl font-bold text-warning mt-1">
                {formatCurrency(totalPendingAmount)}
              </p>
            </div>
            <div className="rounded-full bg-warning/10 p-3">
              <Banknote className="h-8 w-8 text-warning" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Collections</TabsTrigger>
          <TabsTrigger value="paid">Paid Collections</TabsTrigger>
          <TabsTrigger value="all">All Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent Name</TableHead>
                    <TableHead className="text-right">Pending Bookings</TableHead>
                    <TableHead className="text-right">Total Outstanding</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentSummaries
                    .filter(agent => agent.all_collections.some(c => c.status === 'PENDING'))
                    .map((agent) => {
                      const outstanding = agent.all_collections.reduce((sum, c) => sum + Math.max(parseFloat((c as any).due_amount?.toString?.() ?? `${(c as any).due_amount}`) - parseFloat((c as any).paid_amount?.toString?.() ?? `${(c as any).paid_amount}`), 0), 0);
                      const pendingCount = agent.all_collections.filter(c => c.status === 'PENDING').length;
                      return (
                        <TableRow key={agent.agent_id}>
                          <TableCell className="font-medium">{agent.agent_name}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                              {pendingCount} Pending
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-warning">
                            {formatCurrency(outstanding)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => openPaymentDialog(agent)}
                            >
                              Record Payment
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {agentSummaries.filter(agent => agent.all_collections.some(c => c.status === 'PENDING')).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No pending collections
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid">
          <Card>
            <CardHeader>
              <CardTitle>Paid Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent Name</TableHead>
                    <TableHead className="text-right">Paid Bookings</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentSummaries
                    .filter(agent => agent.all_collections.some(c => c.status === 'PAID'))
                    .map((agent) => {
                      const paidCount = agent.all_collections.filter(c => c.status === 'PAID').length;
                      const totalPaid = agent.all_collections
                        .filter(c => c.status === 'PAID')
                        .reduce((sum, c) => sum + parseFloat((c as any).paid_amount?.toString?.() ?? `${(c as any).paid_amount}`), 0);
                      return (
                        <TableRow key={agent.agent_id}>
                          <TableCell className="font-medium">{agent.agent_name}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              {paidCount} Paid
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-success">
                            {formatCurrency(totalPaid)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              <CheckCircle className="h-3 w-3 mr-1 inline" />
                              Settled
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {agentSummaries.filter(agent => agent.all_collections.some(c => c.status === 'PAID')).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No paid collections
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Agents Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent Name</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Total Due</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentSummaries.map((agent) => {
                    const outstanding = agent.all_collections.reduce((sum, c) => sum + Math.max(parseFloat((c as any).due_amount?.toString?.() ?? `${(c as any).due_amount}`) - parseFloat((c as any).paid_amount?.toString?.() ?? `${(c as any).paid_amount}`), 0), 0);
                    return (
                      <TableRow key={agent.agent_id}>
                        <TableCell className="font-medium">{agent.agent_name}</TableCell>
                        <TableCell className="text-right">{agent.bookings_count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(agent.total_due)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(agent.total_paid)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(outstanding)}
                        </TableCell>
                        <TableCell className="text-right">
                          {outstanding > 0 ? (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                              {agent.all_collections.filter(c => c.status === 'PENDING').length} Pending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              Settled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {outstanding > 0 && (
                            <Button
                              size="sm"
                              onClick={() => openPaymentDialog(agent)}
                            >
                              Record Payment
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {agentSummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No collections found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Payment - {selectedAgent?.agent_name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Due:</span>
                  <p className="font-semibold">{formatCurrency(selectedAgent?.total_due || 0)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Already Paid:</span>
                  <p className="font-semibold">{formatCurrency(selectedAgent?.total_paid || 0)}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Outstanding:</span>
                  <p className="text-xl font-bold text-warning">
                    {formatCurrency((selectedAgent?.all_collections.reduce((sum, c) => sum + Math.max(parseFloat((c as any).due_amount?.toString?.() ?? `${(c as any).due_amount}`) - parseFloat((c as any).paid_amount?.toString?.() ?? `${(c as any).paid_amount}`), 0), 0) || 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Pending Collections */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  Pending Collections
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    {selectedAgent?.all_collections.filter(c => c.status === 'PENDING').length || 0}
                  </Badge>
                </label>
                <div className="max-h-48 space-y-2 overflow-auto">
                  {selectedAgent?.all_collections
                    .filter(c => c.status === 'PENDING')
                    .map((collection: any) => {
                      const bookingTotal = collection.bookings.booking_items?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) || 0;
                      return (
                        <div key={collection.id} className="rounded-lg border border-warning/20 bg-warning/5 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">
                                {collection.bookings.routes.route_name} - {collection.bookings.buses.bus_no}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(collection.bookings.booking_date)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Booking Total: {formatCurrency(bookingTotal)} → Agent keeps 10%, Collect: {formatCurrency(collection.due_amount)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-warning">{formatCurrency(collection.due_amount)}</p>
                              <p className="text-sm text-muted-foreground">
                                Paid: {formatCurrency(collection.paid_amount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {selectedAgent?.all_collections.filter(c => c.status === 'PENDING').length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No pending collections</p>
                  )}
                </div>
              </div>

              {/* Paid Collections */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  Paid Collections
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    {selectedAgent?.all_collections.filter(c => c.status === 'PAID').length || 0}
                  </Badge>
                </label>
                <div className="max-h-48 space-y-2 overflow-auto">
                  {selectedAgent?.all_collections
                    .filter(c => c.status === 'PAID')
                    .map((collection: any) => {
                      const bookingTotal = collection.bookings.booking_items?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) || 0;
                      return (
                        <div key={collection.id} className="rounded-lg border border-success/20 bg-success/5 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">
                                {collection.bookings.routes.route_name} - {collection.bookings.buses.bus_no}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(collection.bookings.booking_date)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Booking Total: {formatCurrency(bookingTotal)} → Agent keeps 10%, Collected: {formatCurrency(collection.due_amount)}
                              </p>
                              {collection.paid_on && (
                                <p className="text-xs text-muted-foreground">
                                  Paid on: {formatDate(collection.paid_on)}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-success">{formatCurrency(collection.due_amount)}</p>
                              <p className="text-sm text-success">
                                Paid: {formatCurrency(collection.paid_amount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {selectedAgent?.all_collections.filter(c => c.status === 'PAID').length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No paid collections</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Amount</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const firstPending = selectedAgent?.all_collections.find(c => c.status === 'PENDING');
                  if (selectedAgent && firstPending) {
                    handleMarkPaid(firstPending.id);
                  }
                }}
                disabled={processing || !selectedAgent?.all_collections.some(c => c.status === 'PENDING')}
                className="flex-1"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Record Payment
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Collections;
