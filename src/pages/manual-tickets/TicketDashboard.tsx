import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Ticket,
  IndianRupee,
  Users,
  AlertCircle,
  Search,
  Printer,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Download,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { toast } from "sonner";
import { printTicket } from "@/lib/utils/ticketPrinter";

interface ManualTicket {
  id: string;
  ticket_no: string;
  booking_date_time: string;
  journey_date: string;
  passenger_name: string;
  passenger_phone: string;
  tours_to: string;
  no_of_tourist: number;
  seat_no: string | null;
  amount: number;
  collection_status: string;
  with_family_friends: string | null;
  address: string | null;
  rep_time: string | null;
  dep_time: string | null;
  pnr_no: string | null;
  bus_no: string | null;
  branch: string | null;
  notes: string | null;
}

interface TicketPayment {
  received_by_name: string;
  payment_mode: string;
  paid_amount: number;
}

interface CompanySettings {
  company_name: string;
  address_line: string;
  phone_numbers: string;
  footer_note: string;
}

export default function TicketDashboard() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tickets, setTickets] = useState<ManualTicket[]>([]);
  const [payments, setPayments] = useState<Record<string, TicketPayment>>({});
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch tickets for selected date
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("manual_tickets")
        .select("*")
        .gte("booking_date_time", `${selectedDate}T00:00:00`)
        .lt("booking_date_time", `${selectedDate}T23:59:59`)
        .order("booking_date_time", { ascending: false });

      if (ticketsError) throw ticketsError;
      setTickets(ticketsData || []);

      // Fetch payments for these tickets
      if (ticketsData && ticketsData.length > 0) {
        const ticketIds = ticketsData.map((t) => t.id);
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("ticket_payments")
          .select("ticket_id, received_by_name, payment_mode, paid_amount")
          .in("ticket_id", ticketIds);

        if (paymentsError) throw paymentsError;

        const paymentsMap: Record<string, TicketPayment> = {};
        paymentsData?.forEach((p) => {
          paymentsMap[p.ticket_id] = p;
        });
        setPayments(paymentsMap);
      } else {
        setPayments({});
      }

      // Fetch company settings
      const { data: settingsData } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      setCompanySettings(settingsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTicketId) return;
    
    try {
      const { error } = await supabase
        .from("manual_tickets")
        .delete()
        .eq("id", deleteTicketId);

      if (error) throw error;
      toast.success("Ticket deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.error("Failed to delete ticket");
    } finally {
      setDeleteTicketId(null);
    }
  };

  const handlePrint = (ticket: ManualTicket) => {
    const payment = payments[ticket.id];
    printTicket(ticket, payment, companySettings);
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      searchTerm === "" ||
      ticket.ticket_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.passenger_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.passenger_phone.includes(searchTerm);

    const matchesStatus =
      statusFilter === "all" ||
      ticket.collection_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate summary stats
  const totalTickets = filteredTickets.length;
  const totalPassengers = filteredTickets.reduce((sum, t) => sum + t.no_of_tourist, 0);
  const paidTickets = filteredTickets.filter((t) => t.collection_status === "PAID");
  const unpaidTickets = filteredTickets.filter((t) => t.collection_status === "UNPAID");
  const totalCollection = paidTickets.reduce((sum, t) => {
    const payment = payments[t.id];
    return sum + (payment?.paid_amount || t.amount);
  }, 0);
  const totalUnpaid = unpaidTickets.reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Ticket Dashboard</h1>
          <p className="text-muted-foreground">Manage your manual bus ticket bookings</p>
        </div>
        <Button onClick={() => navigate("/tickets/new")} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Tickets Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl md:text-3xl font-bold">{totalTickets}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Total Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl md:text-3xl font-bold text-green-600">
              {formatCurrency(totalCollection)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Total Unpaid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl md:text-3xl font-bold text-red-600">
              {formatCurrency(totalUnpaid)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Passengers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl md:text-3xl font-bold">{totalPassengers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full md:w-auto"
              />
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ticket no, name, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PAID">Paid Only</SelectItem>
                <SelectItem value="UNPAID">Unpaid Only</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => toast.info("Export feature coming soon")}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket No</TableHead>
                  <TableHead>Booking Time</TableHead>
                  <TableHead>Journey Date</TableHead>
                  <TableHead>Tours To</TableHead>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Tourists</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No tickets found for this date
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => {
                    const payment = payments[ticket.id];
                    return (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono font-medium">
                          {ticket.ticket_no}
                        </TableCell>
                        <TableCell>
                          {format(new Date(ticket.booking_date_time), "hh:mm a")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(ticket.journey_date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{ticket.tours_to}</TableCell>
                        <TableCell>{ticket.passenger_name}</TableCell>
                        <TableCell>{ticket.passenger_phone}</TableCell>
                        <TableCell className="text-center">{ticket.no_of_tourist}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(ticket.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {ticket.collection_status === "PAID" ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Unpaid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment?.received_by_name || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePrint(ticket)}
                              title="Print"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/tickets/${ticket.id}/edit`)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTicketId(ticket.id)}
                              title="Delete"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTicketId} onOpenChange={() => setDeleteTicketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The ticket and its payment records will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
