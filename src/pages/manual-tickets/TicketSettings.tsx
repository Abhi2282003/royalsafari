import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Save, Plus, Edit, Trash2, Loader2, Building, Users } from "lucide-react";
import { toast } from "sonner";

interface CompanySettings {
  id: string;
  company_name: string;
  address_line: string;
  phone_numbers: string;
  logo_url: string | null;
  footer_note: string;
}

interface ReceiverName {
  id: string;
  name: string;
  active: boolean;
}

export default function TicketSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Company settings
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState("");
  const [footerNote, setFooterNote] = useState("");

  // Receiver names
  const [receivers, setReceivers] = useState<ReceiverName[]>([]);
  const [showReceiverDialog, setShowReceiverDialog] = useState(false);
  const [editingReceiver, setEditingReceiver] = useState<ReceiverName | null>(null);
  const [receiverName, setReceiverName] = useState("");
  const [deleteReceiverId, setDeleteReceiverId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsResult, receiversResult] = await Promise.all([
        supabase.from("company_settings").select("*").limit(1).maybeSingle(),
        supabase.from("receiver_names").select("*").order("name"),
      ]);

      if (settingsResult.data) {
        setCompanySettings(settingsResult.data);
        setCompanyName(settingsResult.data.company_name);
        setAddressLine(settingsResult.data.address_line || "");
        setPhoneNumbers(settingsResult.data.phone_numbers || "");
        setFooterNote(settingsResult.data.footer_note || "");
      }

      if (receiversResult.data) {
        setReceivers(receiversResult.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveCompanySettings = async () => {
    setSaving(true);
    try {
      const data = {
        company_name: companyName.trim(),
        address_line: addressLine.trim(),
        phone_numbers: phoneNumbers.trim(),
        footer_note: footerNote.trim(),
        updated_at: new Date().toISOString(),
      };

      if (companySettings) {
        const { error } = await supabase
          .from("company_settings")
          .update(data)
          .eq("id", companySettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_settings")
          .insert(data);
        if (error) throw error;
      }

      toast.success("Company settings saved!");
      fetchData();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddReceiver = () => {
    setEditingReceiver(null);
    setReceiverName("");
    setShowReceiverDialog(true);
  };

  const handleEditReceiver = (receiver: ReceiverName) => {
    setEditingReceiver(receiver);
    setReceiverName(receiver.name);
    setShowReceiverDialog(true);
  };

  const saveReceiver = async () => {
    if (!receiverName.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      if (editingReceiver) {
        const { error } = await supabase
          .from("receiver_names")
          .update({ name: receiverName.trim() })
          .eq("id", editingReceiver.id);
        if (error) throw error;
        toast.success("Receiver updated!");
      } else {
        const { error } = await supabase
          .from("receiver_names")
          .insert({ name: receiverName.trim() });
        if (error) throw error;
        toast.success("Receiver added!");
      }
      setShowReceiverDialog(false);
      fetchData();
    } catch (error: any) {
      console.error("Error saving receiver:", error);
      toast.error(error.message || "Failed to save receiver");
    }
  };

  const toggleReceiverActive = async (receiver: ReceiverName) => {
    try {
      const { error } = await supabase
        .from("receiver_names")
        .update({ active: !receiver.active })
        .eq("id", receiver.id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      console.error("Error toggling receiver:", error);
      toast.error(error.message || "Failed to update receiver");
    }
  };

  const deleteReceiver = async () => {
    if (!deleteReceiverId) return;
    try {
      const { error } = await supabase
        .from("receiver_names")
        .delete()
        .eq("id", deleteReceiverId);
      if (error) throw error;
      toast.success("Receiver deleted!");
      setDeleteReceiverId(null);
      fetchData();
    } catch (error: any) {
      console.error("Error deleting receiver:", error);
      toast.error(error.message || "Failed to delete receiver");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage company details and receiver names</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Header
            </CardTitle>
            <CardDescription>
              These details appear on printed tickets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                placeholder="e.g., ROYAL TOURS & TRAVELS"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Address Line</Label>
              <Textarea
                placeholder="Company address"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Numbers</Label>
              <Input
                placeholder="e.g., +91 98765 43210, +91 12345 67890"
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Footer Note (on ticket)</Label>
              <Input
                placeholder="e.g., Wish you a Happy Journey"
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
              />
            </div>

            <Button onClick={saveCompanySettings} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Company Settings
            </Button>
          </CardContent>
        </Card>

        {/* Receiver Names */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Receiver Names
                </CardTitle>
                <CardDescription>
                  People who can receive payments
                </CardDescription>
              </div>
              <Button size="sm" onClick={handleAddReceiver}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No receivers added yet
                    </TableCell>
                  </TableRow>
                ) : (
                  receivers.map((receiver) => (
                    <TableRow key={receiver.id}>
                      <TableCell className="font-medium">{receiver.name}</TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={receiver.active}
                          onCheckedChange={() => toggleReceiverActive(receiver)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditReceiver(receiver)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteReceiverId(receiver.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Receiver Dialog */}
      <Dialog open={showReceiverDialog} onOpenChange={setShowReceiverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReceiver ? "Edit Receiver" : "Add Receiver"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="e.g., Owner, Counter1, Manager"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiverDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveReceiver}>
              {editingReceiver ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReceiverId} onOpenChange={() => setDeleteReceiverId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receiver?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this person from the receiver list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteReceiver} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
