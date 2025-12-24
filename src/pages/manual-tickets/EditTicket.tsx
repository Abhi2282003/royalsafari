import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

export default function EditTicket() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState<ManualTicket | null>(null);

  // Form state
  const [journeyDate, setJourneyDate] = useState("");
  const [bookingDate, setBookingDate] = useState("");
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

  useEffect(() => {
    if (id) fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("manual_tickets")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setTicket(data);

      // Populate form
      setJourneyDate(format(new Date(data.journey_date), "yyyy-MM-dd"));
      setBookingDate(format(new Date(data.booking_date_time), "yyyy-MM-dd"));
      setPassengerName(data.passenger_name);
      setWithFamilyFriends(!!data.with_family_friends);
      setFamilyFriendsText(data.with_family_friends || "");
      setToursTo(data.tours_to);
      setAddress(data.address || "");
      setPhone(data.passenger_phone);
      setNoOfTourist(data.no_of_tourist.toString());
      setSeatNo(data.seat_no || "");
      setRepTime(data.rep_time || "");
      setDepTime(data.dep_time || "");
      setAmount(data.amount.toString());
      setPnrNo(data.pnr_no || "");
      setBusNo(data.bus_no || "");
      setBranch(data.branch || "");
      setNotes(data.notes || "");
    } catch (error) {
      console.error("Error fetching ticket:", error);
      toast.error("Failed to load ticket");
      navigate("/tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
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

    setSaving(true);
    try {
      const updateData = {
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
      };

      const { error } = await supabase
        .from("manual_tickets")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast.success("Ticket updated successfully!");
      navigate(`/tickets/${id}`);
    } catch (error: any) {
      console.error("Error updating ticket:", error);
      toast.error(error.message || "Failed to update ticket");
    } finally {
      setSaving(false);
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/tickets/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Edit Ticket</h1>
          <p className="text-muted-foreground font-mono">{ticket.ticket_no}</p>
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
                  disabled
                  className="bg-muted"
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
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row gap-4 justify-end">
        <Button variant="outline" onClick={() => navigate(`/tickets/${id}`)} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
