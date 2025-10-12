import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface CounterBookingDetail {
  id: number;
  customer_name: string;
  contact_number: string;
  bus_name: string;
  from_city: string;
  to_city: string;
  seats: string;
  amount: number;
  surcharges: number;
  total: number;
  booking_date: string;
}

const Reports = () => {
  const [dailyBookings, setDailyBookings] = useState<CounterBookingDetail[]>([]);
  const [monthlyBookings, setMonthlyBookings] = useState<CounterBookingDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Fetch daily counter bookings
      const { data: dailyData, error: dailyError } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          routes(route_name),
          buses(owner_name),
          booking_items(customer_name, description, seat_no, amount, surcharges)
        `)
        .eq("type", "COUNTER")
        .gte("booking_date", today.toISOString())
        .order("booking_date", { ascending: false });

      if (dailyError) throw dailyError;

      // Fetch monthly counter bookings
      const { data: monthlyData, error: monthlyError } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          routes(route_name),
          buses(owner_name),
          booking_items(customer_name, description, seat_no, amount, surcharges)
        `)
        .eq("type", "COUNTER")
        .gte("booking_date", startOfMonth.toISOString())
        .order("booking_date", { ascending: false });

      if (monthlyError) throw monthlyError;

      const processBookings = (data: any[]): CounterBookingDetail[] => {
        return data.flatMap((booking: any) =>
          (booking.booking_items || []).map((item: any) => {
            const descParts = item.description?.split(" | ") || [];
            const contactNumber = descParts.find((p: string) => p.startsWith("Contact:"))?.replace("Contact: ", "") || "";
            const fromCity = descParts.find((p: string) => p.startsWith("From:"))?.replace("From: ", "") || "";
            const toCity = descParts.find((p: string) => p.startsWith("To:"))?.replace("To: ", "") || "";

            return {
              id: item.id || booking.id,
              customer_name: item.customer_name || "N/A",
              contact_number: contactNumber,
              bus_name: booking.buses?.owner_name || "N/A",
              from_city: fromCity,
              to_city: toCity,
              seats: item.seat_no || "N/A",
              amount: parseFloat(item.amount) || 0,
              surcharges: parseFloat(item.surcharges) || 0,
              total: (parseFloat(item.amount) || 0) + (parseFloat(item.surcharges) || 0),
              booking_date: booking.booking_date,
            };
          })
        );
      };

      setDailyBookings(processBookings(dailyData || []));
      setMonthlyBookings(processBookings(monthlyData || []));
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (bookings: CounterBookingDetail[]) => {
    return bookings.reduce(
      (acc, booking) => ({
        amount: acc.amount + booking.amount,
        surcharges: acc.surcharges + booking.surcharges,
        total: acc.total + booking.total,
      }),
      { amount: 0, surcharges: 0, total: 0 }
    );
  };

  const renderBookingsTable = (bookings: CounterBookingDetail[]) => {
    const totals = calculateTotals(bookings);

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Customer Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Bus Name</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Seats</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Surcharges</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground">
                No counter bookings found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{formatDate(booking.booking_date)}</TableCell>
                  <TableCell>{booking.customer_name}</TableCell>
                  <TableCell>{booking.contact_number}</TableCell>
                  <TableCell>{booking.bus_name}</TableCell>
                  <TableCell>{booking.from_city}</TableCell>
                  <TableCell>{booking.to_city}</TableCell>
                  <TableCell>{booking.seats}</TableCell>
                  <TableCell className="text-right">{formatCurrency(booking.amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(booking.surcharges)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(booking.total)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={7}>Total ({bookings.length} bookings)</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.amount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.surcharges)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Counter Booking Reports</h1>
        <p className="text-muted-foreground mt-2">View daily and monthly counter booking reports</p>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Today's Counter Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {renderBookingsTable(dailyBookings)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>This Month's Counter Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {renderBookingsTable(monthlyBookings)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
