import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Farm from "./pages/Farm";
import Pet from "./pages/Pet";
import Tasks from "./pages/Tasks";
import TeacherDashboard from "./pages/TeacherDashboard";
import Profile from "./pages/Profile";
import CreateTask from "./pages/CreateTask";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/farm" element={<Farm />} />
          <Route path="/pet" element={<Pet />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/teacher/create-task" element={<CreateTask />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
