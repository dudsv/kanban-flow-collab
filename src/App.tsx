import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import People from "./pages/People";
import Board from "./pages/Board";
import Files from "./pages/Files";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ProjectProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/projects"
                element={
                  <AuthGuard>
                    <Projects />
                  </AuthGuard>
                }
              />
              <Route
                path="/people"
                element={
                  <AuthGuard>
                    <People />
                  </AuthGuard>
                }
              />
              <Route
                path="/projects/:id/board"
                element={
                  <AuthGuard>
                    <Board />
                  </AuthGuard>
                }
              />
              <Route
                path="/projects/:id/files"
                element={
                  <AuthGuard>
                    <Files />
                  </AuthGuard>
                }
              />
              <Route
                path="/chat"
                element={
                  <AuthGuard>
                    <Chat />
                  </AuthGuard>
                }
              />
              <Route path="/" element={<Navigate to="/projects" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ProjectProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
