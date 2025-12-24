import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Printer, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { printTicket } from "@/lib/utils/ticketPrinter";

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

export default function NewTicket() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [receivers, setReceivers] = useState<ReceiverName[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  // Form state
  const [journeyDate, setJourneyDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bookingDate, setBookingDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [passengerName, setPassengerName] = useState("");
  const [withFamilyFriends, setWithFamilyFriends] = useState(false);
  const [familyFriendsText, setFamilyFriendsText] = useState("");
  const [toursTo, setToursTo] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [noOfTourist, setNoOfTourist] = useState("1");
  const [seatNo, setSeatNo] = useState("");
  const [repTime, setRepTime] = useState("");
  const [depTime, setDepTime] = useState("");
  const [amount, setAmount] = useState("");
  const [pnrNo, setPnrNo] = useState("");
  const [busNo, setBusNo] = useState("");
  const [branch, setBranch] = useState("");
  const [notes, setNotes] = useState("");

  // Payment state
  const [isPaid, setIsPaid] = useState(false);
  const [receivedBy, setReceivedBy] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [receiversResult, settingsResult] = await Promise.all([
        supabase.from("receiver_names").select("*").eq("active", true),
        supabase.from("company_settings").select("*").limit(1).maybeSingle(),
      ]);

      if (receiversResult.data) setReceivers(receiversResult.data);
      if (settingsResult.data) setCompanySettings(settingsResult.data);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const generateTicketNo = async (): Promise<string> => {
    const { data, error } = await supabase.rpc("generate_ticket_no");
    if (error) throw error;
    return data;
  };

  const handleSubmit = async (shouldPrint: boolean = false) => {
    if (!passengerName.trim()) {
      toast.error("Passenger name is required");
      return;
    }
    if (!phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (!toursTo.trim()) {
      toast.error("Tours To (destination) is required");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Amount is required");
      return;
    }
    if (isPaid && !receivedBy) {
      toast.error("Please select who received the payment");
      return;
    }

    setLoading(true);
    try {
      // Generate ticket number
      const ticketNo = await generateTicketNo();

      // Create ticket
      const ticketData = {
        ticket_no: ticketNo,
        booking_date_time: new Date(`${bookingDate}T${format(new Date(), "HH:mm:ss")}`).toISOString(),
        journey_date: journeyDate,
        passenger_name: passengerName.trim(),
        passenger_phone: phone.trim(),
        with_family_friends: withFamilyFriends ? familyFriendsText : null,
        address: address.trim() || null,
        tours_to: toursTo.trim(),
        no_of_tourist: parseInt(noOfTourist) || 1,
        seat_no: seatNo.trim() || null,
        rep_time: repTime.trim() || null,
        dep_time: depTime.trim() || null,
        amount: parseFloat(amount),
        pnr_no: pnrNo.trim() || null,
        bus_no: busNo.trim() || null,
        branch: branch.trim() || null,
        notes: notes.trim() || null,
        collection_status: isPaid ? "PAID" : "UNPAID",
      };

      const { data: ticket, error: ticketError } = await supabase
        .from("manual_tickets")
        .insert(ticketData)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create payment record if paid
      if (isPaid && ticket) {
        const { error: paymentError } = await supabase
          .from("ticket_payments")
          .insert({
            ticket_id: ticket.id,
            received_by_name: receivedBy,
            payment_mode: paymentMode,
            paid_amount: parseFloat(amount),
          });

        if (paymentError) throw paymentError;
      }

      toast.success("Ticket created successfully!");

      if (shouldPrint && ticket) {
        const payment = isPaid
          ? { received_by_name: receivedBy, payment_mode: paymentMode, paid_amount: parseFloat(amount) }
          : undefined;
        printTicket(ticket, payment, companySettings);
      }

      navigate("/tickets");
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      toast.error(error.message || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">New Ticket</h1>
          <p className="text-muted-foreground">Create a new manual bus ticket</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Main Ticket Details */}
        <Card>
          <CardHeader>
            <CardTitle>Passenger & Journey Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Journey Date *</Label>
                <Input
                  type="date"
                  value={journeyDate}
                  onChange={(e) => setJourneyDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Booking Date</Label>
                <Input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Shri/Smt (Passenger Name) *</Label>
              <Input
                placeholder="Enter passenger name"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="withFamily"
                  checked={withFamilyFriends}
                  onCheckedChange={(checked) => setWithFamilyFriends(checked as boolean)}
                />
                <Label htmlFor="withFamily" className="cursor-pointer">
                  With Family/Friends
                </Label>
              </div>
              {withFamilyFriends && (
                <Input
                  placeholder="Names of family/friends"
                  value={familyFriendsText}
                  onChange={(e) => setFamilyFriendsText(e.target.value)}
                  className="flex-1"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Tours To (Destination) *</Label>
              <Input
                placeholder="Enter destination/route"
                value={toursTo}
                onChange={(e) => setToursTo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                placeholder="Enter address (optional)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>No. of Tourists *</Label>
                <Input
                  type="number"
                  min="1"
                  value={noOfTourist}
                  onChange={(e) => setNoOfTourist(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Seat No.</Label>
                <Input
                  placeholder="e.g., 1, 2, 3"
                  value={seatNo}
                  onChange={(e) => setSeatNo(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reporting Time</Label>
                <Input
                  type="time"
                  value={repTime}
                  onChange={(e) => setRepTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Departure Time</Label>
                <Input
                  type="time"
                  value={depTime}
                  onChange={(e) => setDepTime(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amount & Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Amount & Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PNR No.</Label>
                <Input
                  placeholder="Optional"
                  value={pnrNo}
                  onChange={(e) => setPnrNo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Bus No.</Label>
                <Input
                  placeholder="Optional"
                  value={busNo}
                  onChange={(e) => setBusNo(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Branch</Label>
              <Input
                placeholder="Optional"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Section */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Payment Collection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isPaid"
                checked={isPaid}
                onCheckedChange={(checked) => setIsPaid(checked as boolean)}
              />
              <Label htmlFor="isPaid" className="cursor-pointer text-lg">
                Mark as Paid / Collection Received
              </Label>
            </div>

            {isPaid && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end">
        <Button variant="outline" onClick={() => navigate("/tickets")} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={() => handleSubmit(false)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Ticket
        </Button>
        <Button onClick={() => handleSubmit(true)} disabled={loading} variant="secondary">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
          Save & Print
        </Button>
      </div>
    </div>
  );
}
