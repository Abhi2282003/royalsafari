import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Printer,
  Edit,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  IndianRupee,
  Hash,
  Bus,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/currency";
import { printTicket } from "@/lib/utils/ticketPrinter";

interface ManualTicket {
  id: string;
  ticket_no: string;
  booking_date_time: string;
  journey_date: string;
  passenger_name: string;
  passenger_phone: string;
  with_family_friends: string | null;
  address: string | null;
  tours_to: string;
  no_of_tourist: number;
  seat_no: string | null;
  rep_time: string | null;
  dep_time: string | null;
  amount: number;
  pnr_no: string | null;
  bus_no: string | null;
  branch: string | null;
  notes: string | null;
  collection_status: string;
}

interface TicketPayment {
  received_by_name: string;
  payment_mode: string;
  paid_amount: number;
  paid_at: string;
}

interface ReceiverName {
  id: string;
  name: string;
}

interface CompanySettings {
  company_name: string;
  address_line: string;
  phone_numbers: string;
  footer_note: string;
}

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<ManualTicket | null>(null);
  const [payment, setPayment] = useState<TicketPayment | null>(null);
  const [receivers, setReceivers] = useState<ReceiverName[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Payment form state
  const [receivedBy, setReceivedBy] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");

  useEffect(() => {
    if (id) fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    setLoading(true);
    try {
      const [ticketResult, paymentResult, receiversResult, settingsResult] = await Promise.all([
        supabase.from("manual_tickets").select("*").eq("id", id).single(),
        supabase.from("ticket_payments").select("*").eq("ticket_id", id).maybeSingle(),
        supabase.from("receiver_names").select("*").eq("active", true),
        supabase.from("company_settings").select("*").limit(1).maybeSingle(),
      ]);

      if (ticketResult.error) throw ticketResult.error;
      setTicket(ticketResult.data);
      setPayment(paymentResult.data);
      setReceivers(receiversResult.data || []);
      setCompanySettings(settingsResult.data);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      toast.error("Failed to load ticket");
      navigate("/tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!receivedBy) {
      toast.error("Please select who received the payment");
      return;
    }

    setPaymentLoading(true);
    try {
      // Create payment record
      const { error: paymentError } = await supabase.from("ticket_payments").insert({
        ticket_id: id,
        received_by_name: receivedBy,
        payment_mode: paymentMode,
        paid_amount: ticket?.amount || 0,
      });

      if (paymentError) throw paymentError;

      // Update ticket status
      const { error: ticketError } = await supabase
        .from("manual_tickets")
        .update({ collection_status: "PAID" })
        .eq("id", id);

      if (ticketError) throw ticketError;

      toast.success("Payment recorded successfully!");
      setShowPaymentDialog(false);
      fetchTicket();
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast.error(error.message || "Failed to record payment");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePrint = () => {
    if (ticket) {
      printTicket(ticket, payment || undefined, companySettings);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ticket not found</p>
        <Button onClick={() => navigate("/tickets")} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-mono">{ticket.ticket_no}</h1>
            <p className="text-muted-foreground">Ticket Details</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate(`/tickets/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          {ticket.collection_status === "UNPAID" && (
            <Button onClick={() => setShowPaymentDialog(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <Card className={ticket.collection_status === "PAID" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {ticket.collection_status === "PAID" ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <p className={`font-semibold text-lg ${ticket.collection_status === "PAID" ? "text-green-700" : "text-red-700"}`}>
                  {ticket.collection_status === "PAID" ? "Payment Collected" : "Payment Pending"}
                </p>
                {payment && (
                  <p className="text-sm text-green-600">
                    Received by {payment.received_by_name} via {payment.payment_mode} on{" "}
                    {format(new Date(payment.paid_at), "dd/MM/yyyy hh:mm a")}
                  </p>
                )}
              </div>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(ticket.amount)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Passenger Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Passenger Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{ticket.passenger_name}</span>
            </div>
            {ticket.with_family_friends && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">With</span>
                <span>{ticket.with_family_friends}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Phone className="h-4 w-4" /> Phone
              </span>
              <span>{ticket.passenger_phone}</span>
            </div>
            {ticket.address && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> Address
                </span>
                <span className="text-right max-w-[200px]">{ticket.address}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">No. of Tourists</span>
              <Badge variant="secondary">{ticket.no_of_tourist}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Journey Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              Journey Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tours To</span>
              <span className="font-medium">{ticket.tours_to}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Journey Date
              </span>
              <span>{format(new Date(ticket.journey_date), "dd/MM/yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Booking Date</span>
              <span>{format(new Date(ticket.booking_date_time), "dd/MM/yyyy hh:mm a")}</span>
            </div>
            {ticket.seat_no && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seat No.</span>
                <span>{ticket.seat_no}</span>
              </div>
            )}
            {ticket.rep_time && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" /> Rep. Time
                </span>
                <span>{ticket.rep_time}</span>
              </div>
            )}
            {ticket.dep_time && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dep. Time</span>
                <span>{ticket.dep_time}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Additional Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ticket.pnr_no && (
                <div>
                  <span className="text-sm text-muted-foreground">PNR No.</span>
                  <p className="font-medium">{ticket.pnr_no}</p>
                </div>
              )}
              {ticket.bus_no && (
                <div>
                  <span className="text-sm text-muted-foreground">Bus No.</span>
                  <p className="font-medium">{ticket.bus_no}</p>
                </div>
              )}
              {ticket.branch && (
                <div>
                  <span className="text-sm text-muted-foreground">Branch</span>
                  <p className="font-medium">{ticket.branch}</p>
                </div>
              )}
            </div>
            {ticket.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <span className="text-sm text-muted-foreground">Notes</span>
                  <p className="mt-1">{ticket.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mark as Paid Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <p className="text-2xl font-bold">{formatCurrency(ticket.amount)}</p>
            </div>
            <div className="space-y-2">
              <Label>Received By *</Label>
              <Select value={receivedBy} onValueChange={setReceivedBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select receiver" />
                </SelectTrigger>
                <SelectContent>
                  {receivers.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkPaid} disabled={paymentLoading}>
              {paymentLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
