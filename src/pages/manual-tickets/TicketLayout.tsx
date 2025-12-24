import { Outlet, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Plus, Settings, FileText } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/tickets", icon: LayoutDashboard },
  { name: "New Ticket", href: "/tickets/new", icon: Plus },
  { name: "Settings", href: "/tickets/settings", icon: Settings },
];

export default function TicketLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8" />
              <h1 className="text-xl font-bold hidden sm:block">Manual Bus Ticket System</h1>
              <h1 className="text-xl font-bold sm:hidden">Ticket System</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || 
                (item.href === "/tickets" && location.pathname === "/tickets");
              
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
