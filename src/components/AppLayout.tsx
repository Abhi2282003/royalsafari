import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  PlusCircle, 
  Users, 
  Bus, 
  MapPin, 
  FileText, 
  Banknote,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, hideForStaff: true },
  { name: "Add Booking", href: "/bookings/new", icon: PlusCircle },
  { name: "Agent Collections", href: "/collections", icon: Banknote },
  { name: "Owner Memos", href: "/memos", icon: FileText, hideForStaff: true },
  { name: "User Management", href: "/users", icon: Users, adminOnly: true },
  { name: "Routes", href: "/masters/routes", icon: MapPin },
  { name: "Buses", href: "/masters/buses", icon: Bus },
  { name: "Agents", href: "/masters/agents", icon: Users },
  { name: "Bulk Agent Upload", href: "/masters/bulk-agent-upload", icon: Users },
  { name: "Route-Bus Map", href: "/masters/route-buses", icon: MapPin },
];

export const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        
        // Check if user is admin
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        setIsAdmin(roles?.role === "ADMIN");
        setUserRole(roles?.role || "");
      }
    };
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r bg-sidebar transition-all duration-300 z-50 h-full",
          "fixed md:relative",
          sidebarOpen ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0 md:w-16"
        )}
      >
        {/* Header */}
        <div className="flex h-14 md:h-16 items-center justify-between border-b border-sidebar-border px-4">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Bus className="h-5 w-5 md:h-6 md:w-6 text-sidebar-primary" />
              <span className="font-bold text-sm md:text-base text-sidebar-foreground">Royal Safari</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 md:h-10 md:w-10"
          >
            {sidebarOpen ? <X className="h-4 w-4 md:h-5 md:w-5" /> : <Menu className="h-4 w-4 md:h-5 md:w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {navigation
            .filter(item => {
              if (item.adminOnly && !isAdmin) return false;
              if (item.hideForStaff && userRole === "STAFF") return false;
              return true;
            })
            .map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Button
                  key={item.name}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-xs md:text-sm h-9 md:h-10",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  onClick={() => {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                >
                  <item.icon className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.name}</span>}
                </Button>
              );
            })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-3 md:p-4">
          <div className="mb-2 text-xs md:text-sm text-sidebar-foreground truncate max-w-full overflow-hidden">
            {userEmail}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent text-xs md:text-sm h-9 md:h-10"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
            <span className="truncate">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background w-full min-w-0">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex md:hidden items-center h-14 px-4 border-b bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="h-8 w-8 flex-shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 ml-3 min-w-0">
            <Bus className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="font-bold text-sm truncate">Royal Safari</span>
          </div>
        </div>
        
        <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
