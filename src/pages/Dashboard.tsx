import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils/currency";
import { Loader2, TrendingUp, Users, FileText, AlertCircle } from "lucide-react";

interface Stats {
  todayBookings: number;
  todayProfit: number;
  monthBookings: number;
  monthProfit: number;
  pendingCollections: { count: number; amount: number };
  pendingMemos: { count: number; amount: number };
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Get today's bookings
      const { data: todayBookings } = await supabase
        .from("bookings")
        .select("*, booking_items(*)")
        .gte("booking_date", todayStart);

      // Get this month's bookings
      const { data: monthBookings } = await supabase
        .from("bookings")
        .select("*, booking_items(*)")
        .gte("booking_date", monthStart);

      // Get pending collections
      const { data: collections } = await supabase
        .from("agent_collections")
        .select("due_amount, paid_amount")
        .eq("status", "PENDING");

      // Get pending memos
      const { data: memos } = await supabase
        .from("owner_memos")
        .select("owner_payable")
        .eq("status", "PENDING");

      // Calculate profits
      const calculateProfit = (bookings: any[]) => {
        return bookings?.reduce((total, booking) => {
          const items = booking.booking_items || [];
          const itemsTotal = items.reduce((sum: number, item: any) => {
            const amount = parseFloat(item.amount);
            let profit = 0;
            
            switch (booking.type) {
              case "AGENT":
                profit = amount * 0.05; // 5% our profit
                break;
              case "ONLINE":
                profit = amount * 0.05; // 5% our profit
                break;
              case "LUGGAGE":
                profit = amount * 0.35; // 35% our profit
                break;
              case "SELF":
                profit = amount * 0.15; // 15% our profit
                break;
            }
            return sum + profit;
          }, 0);
          return total + itemsTotal;
        }, 0) || 0;
      };

      const todayTotal = todayBookings?.reduce((sum, b) => 
        sum + b.booking_items.reduce((s: number, i: any) => s + parseFloat(i.amount), 0), 0) || 0;
      
      const monthTotal = monthBookings?.reduce((sum, b) => 
        sum + b.booking_items.reduce((s: number, i: any) => s + parseFloat(i.amount), 0), 0) || 0;

      const pendingCollAmount = collections?.reduce((sum, c) => 
        sum + (parseFloat(String(c.due_amount)) - parseFloat(String(c.paid_amount))), 0) || 0;
      
      const pendingMemosAmount = memos?.reduce((sum, m) => 
        sum + parseFloat(String(m.owner_payable)), 0) || 0;

      setStats({
        todayBookings: todayTotal,
        todayProfit: calculateProfit(todayBookings || []),
        monthBookings: monthTotal,
        monthProfit: calculateProfit(monthBookings || []),
        pendingCollections: {
          count: collections?.length || 0,
          amount: pendingCollAmount,
        },
        pendingMemos: {
          count: memos?.length || 0,
          amount: pendingMemosAmount,
        },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Royal Safari Travels</p>
      </div>

      {/* Today's Stats */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Today's Performance</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.todayBookings || 0)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Our Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(stats?.todayProfit || 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* This Month's Stats */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">This Month's Performance</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.monthBookings || 0)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Our Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(stats?.monthProfit || 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending Items */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Pending Items</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Agent Collections</CardTitle>
              <Users className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {stats?.pendingCollections.count || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(stats?.pendingCollections.amount || 0)} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Owner Memos</CardTitle>
              <FileText className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats?.pendingMemos.count || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(stats?.pendingMemos.amount || 0)} payable
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
