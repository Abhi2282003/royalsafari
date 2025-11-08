import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon, Bus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CustomerHome() {
  const navigate = useNavigate();
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [date, setDate] = useState<Date>();
  const [destinations, setDestinations] = useState<string[]>([]);

  useEffect(() => {
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    const { data } = await supabase
      .from("destinations")
      .select("city_name")
      .eq("active", true)
      .order("city_name");
    
    if (data) {
      setDestinations(data.map(d => d.city_name));
    }
  };

  const handleSearch = () => {
    if (!fromCity || !toCity || !date) {
      toast.error("Please fill all fields");
      return;
    }
    if (fromCity === toCity) {
      toast.error("From and To cities must be different");
      return;
    }
    navigate(`/customer/search?from=${fromCity}&to=${toCity}&date=${format(date, "yyyy-MM-dd")}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">BusBooking</span>
          </div>
          <Button variant="outline" onClick={() => navigate("/login")}>
            Admin Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container py-16">
        <div className="mx-auto max-w-3xl text-center space-y-6 mb-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Book Your Bus Tickets Online
          </h1>
          <p className="text-lg text-muted-foreground">
            Fast, easy, and reliable bus booking at your fingertips
          </p>
        </div>

        {/* Search Card */}
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border bg-card p-8 shadow-lg">
            <div className="grid gap-6 md:grid-cols-3">
              {/* From City */}
              <div className="space-y-2">
                <label className="text-sm font-medium">From</label>
                <input
                  list="from-cities"
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  placeholder="Select city"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <datalist id="from-cities">
                  {destinations.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>

              {/* To City */}
              <div className="space-y-2">
                <label className="text-sm font-medium">To</label>
                <input
                  list="to-cities"
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  placeholder="Select city"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <datalist id="to-cities">
                  {destinations.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Journey Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Button 
              onClick={handleSearch} 
              className="w-full mt-6" 
              size="lg"
            >
              Search Buses
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Bus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Wide Network</h3>
            <p className="text-sm text-muted-foreground">
              Multiple routes across Maharashtra & Chhattisgarh
            </p>
          </div>
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Easy Booking</h3>
            <p className="text-sm text-muted-foreground">
              Book your tickets in just a few clicks
            </p>
          </div>
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Instant Confirmation</h3>
            <p className="text-sm text-muted-foreground">
              Get your booking confirmed immediately
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}