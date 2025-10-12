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
  profitBreakdown: {
    agent: number;
    online: number;
    self: number;
    counter: number;
    luggage: number;
  };
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

      // Calculate profits with breakdown
      const profitBreakdown = {
        agent: 0,
        online: 0,
        self: 0,
        counter: 0,
        luggage: 0,
      };

      const calculateProfit = (bookings: any[], includeBreakdown = false) => {
        return bookings?.reduce((total, booking) => {
          const items = booking.booking_items || [];
          const itemsTotal = items.reduce((sum: number, item: any) => {
            const amount = parseFloat(item.amount);
            const surcharges = parseFloat(item.surcharges || 0);
            const totalAmount = amount + surcharges;
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
              case "COUNTER":
                profit = totalAmount * 0.10; // 10% on total + surcharges
                break;
            }

            if (includeBreakdown) {
              if (booking.type === "AGENT") profitBreakdown.agent += profit;
              else if (booking.type === "ONLINE") profitBreakdown.online += profit;
              else if (booking.type === "SELF") profitBreakdown.self += profit;
              else if (booking.type === "COUNTER") profitBreakdown.counter += profit;
              else if (booking.type === "LUGGAGE") profitBreakdown.luggage += profit;
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
        monthProfit: calculateProfit(monthBookings || [], true),
        pendingCollections: {
          count: collections?.length || 0,
          amount: pendingCollAmount,
        },
        pendingMemos: {
          count: memos?.length || 0,
          amount: pendingMemosAmount,
        },
        profitBreakdown,
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
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">Welcome to Royal Safari Travels</p>
      </div>

      {/* Today's Stats */}
      <div>
        <h2 className="mb-3 md:mb-4 text-lg md:text-xl font-semibold">Today's Performance</h2>
        <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-xs md:text-sm font-medium">Total Bookings</CardTitle>
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3 md:px-6 md:pb-4">
              <div className="text-xl md:text-2xl font-bold">{formatCurrency(stats?.todayBookings || 0)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-xs md:text-sm font-medium">Our Profit</CardTitle>
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-success" />
            </CardHeader>
            <CardContent className="px-4 pb-3 md:px-6 md:pb-4">
              <div className="text-xl md:text-2xl font-bold text-success">
                {formatCurrency(stats?.todayProfit || 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* This Month's Stats */}
      <div>
        <h2 className="mb-3 md:mb-4 text-lg md:text-xl font-semibold">This Month's Performance</h2>
        <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-xs md:text-sm font-medium">Total Bookings</CardTitle>
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-3 md:px-6 md:pb-4">
              <div className="text-xl md:text-2xl font-bold">{formatCurrency(stats?.monthBookings || 0)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-xs md:text-sm font-medium">Our Profit</CardTitle>
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-success" />
            </CardHeader>
            <CardContent className="px-4 pb-3 md:px-6 md:pb-4">
              <div className="text-xl md:text-2xl font-bold text-success">
                {formatCurrency(stats?.monthProfit || 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending Items */}
      <div>
        <h2 className="mb-3 md:mb-4 text-lg md:text-xl font-semibold">Pending Items</h2>
        <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-xs md:text-sm font-medium">Agent Collections</CardTitle>
              <Users className="h-3 w-3 md:h-4 md:w-4 text-warning" />
            </CardHeader>
            <CardContent className="px-4 pb-3 md:px-6 md:pb-4">
              <div className="text-xl md:text-2xl font-bold text-warning">
                {stats?.pendingCollections.count || 0}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {formatCurrency(stats?.pendingCollections.amount || 0)} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-xs md:text-sm font-medium">Owner Memos</CardTitle>
              <FileText className="h-3 w-3 md:h-4 md:w-4 text-destructive" />
            </CardHeader>
            <CardContent className="px-4 pb-3 md:px-6 md:pb-4">
              <div className="text-xl md:text-2xl font-bold text-destructive">
                {stats?.pendingMemos.count || 0}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {formatCurrency(stats?.pendingMemos.amount || 0)} payable
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Profit Breakdown Section */}
      <div>
        <h2 className="mb-3 md:mb-4 text-lg md:text-xl font-semibold">Profit Breakdown (This Month)</h2>
        <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2 px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Agent Bookings</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 md:px-6 md:pb-4">
              <div className="text-lg md:text-xl font-bold">{formatCurrency(stats?.profitBreakdown.agent || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">5% commission</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Online Bookings</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 md:px-6 md:pb-4">
              <div className="text-lg md:text-xl font-bold">{formatCurrency(stats?.profitBreakdown.online || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">5% margin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Counter Bookings</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 md:px-6 md:pb-4">
              <div className="text-lg md:text-xl font-bold">{formatCurrency(stats?.profitBreakdown.counter || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">10% on total + surcharges</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Self Bookings</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 md:px-6 md:pb-4">
              <div className="text-lg md:text-xl font-bold">{formatCurrency(stats?.profitBreakdown.self || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">15% profit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-4 py-3 md:px-6 md:py-4">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Luggage</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 md:px-6 md:pb-4">
              <div className="text-lg md:text-xl font-bold">{formatCurrency(stats?.profitBreakdown.luggage || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">35% profit</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
