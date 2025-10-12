import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { AppLayout } from "./components/AppLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SetupUsers from "./pages/SetupUsers";
import Dashboard from "./pages/Dashboard";
import AddBooking from "./pages/AddBooking";
import RoutesPage from "./pages/masters/Routes";
import Buses from "./pages/masters/Buses";
import Agents from "./pages/masters/Agents";
import RouteBuses from "./pages/masters/RouteBuses";
import BulkAgentUpload from "./pages/masters/BulkAgentUpload";
import Collections from "./pages/Collections";
import Memos from "./pages/Memos";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/setup-users" element={<SetupUsers />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <AppLayout />
              </AuthGuard>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="/bookings/new" element={<AddBooking />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/memos" element={<Memos />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/masters/routes" element={<RoutesPage />} />
            <Route path="/masters/buses" element={<Buses />} />
            <Route path="/masters/agents" element={<Agents />} />
            <Route path="/masters/bulk-agent-upload" element={<BulkAgentUpload />} />
            <Route path="/masters/route-buses" element={<RouteBuses />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
