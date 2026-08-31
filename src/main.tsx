import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { RoleGate } from "@/components/RoleGate";
import { SettingsProvider } from "@/lib/settings";
import { AuthProvider } from "@/lib/auth-provider";
import { NotificationCenter } from "@/components/site/NotificationCenter";
import { SeedBootstrap } from "@/components/site/SeedBootstrap";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { TelegramAutoLinker } from "@/components/site/TelegramAutoLinker";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import "./types/global.d.ts";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const InstructorPanel = lazy(() => import("./pages/panels/InstructorPanel.tsx"));
const MentorPanel = lazy(() => import("./pages/panels/MentorPanel.tsx"));
const SupportPanel = lazy(() => import("./pages/panels/SupportPanel.tsx"));
const ContentPanel = lazy(() => import("./pages/panels/ContentPanel.tsx"));
const ContentStudio = lazy(() => import("./pages/panels/ContentStudio.tsx"));
const TelegramBotPanel = lazy(() => import("./pages/panels/TelegramBotPanel.tsx"));
const TelegramMiniApp = lazy(() => import("./pages/TelegramMiniApp.tsx"));
const TelegramAdminCenter = lazy(() => import("./pages/panels/TelegramAdminCenter.tsx"));
const ProfileCompletion = lazy(() => import("./pages/ProfileCompletion.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Public catalog pages
const Courses = lazy(() => import("./pages/Courses.tsx"));
const CourseDetail = lazy(() => import("./pages/CourseDetail.tsx"));
const Tests = lazy(() => import("./pages/Tests.tsx"));
const TestTake = lazy(() => import("./pages/TestTake.tsx"));
const TestResult = lazy(() => import("./pages/TestResult.tsx"));
const DailyQuiz = lazy(() => import("./pages/DailyQuiz.tsx"));
const Products = lazy(() => import("./pages/Products.tsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.tsx"));
const Workshops = lazy(() => import("./pages/Workshops.tsx"));
const WorkshopDetail = lazy(() => import("./pages/WorkshopDetail.tsx"));
const Instructors = lazy(() => import("./pages/Instructors.tsx"));
const InstructorDetail = lazy(() => import("./pages/InstructorDetail.tsx"));
const FreeContent = lazy(() => import("./pages/FreeContent.tsx"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail.tsx"));
const Dictionary = lazy(() => import("./pages/Dictionary.tsx"));
const AIChat = lazy(() => import("./pages/AIChat.tsx"));
const AIManagementPanel = lazy(() => import("./pages/panels/AIManagementPanel.tsx"));
const SuperAdminPanel = lazy(() => import("./pages/panels/SuperAdminPanel.tsx"));
const Rules = lazy(() => import("./pages/Rules.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <SettingsProvider>
      {/* JWT Auth provider (new) */}
      <AuthProvider>
      {/* ConvexAuthProvider kept for unmigrated pages — auth no longer depends on it */}
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <NotificationCenter />
          <SeedBootstrap />
          <TelegramAutoLinker />
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/auth"
                element={<AuthPage />}
              />

              {/* Catalog */}
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:slug" element={<CourseDetail />} />
              <Route path="/tests" element={<Tests />} />
              <Route path="/tests/:slug" element={<RequireAuth><TestTake /></RequireAuth>} />
              <Route path="/tests/result/:attemptId" element={<RequireAuth><TestResult /></RequireAuth>} />
              <Route path="/daily-quiz" element={<DailyQuiz />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:slug" element={<ProductDetail />} />
              <Route path="/workshops" element={<Workshops />} />
              <Route path="/workshops/:slug" element={<WorkshopDetail />} />
              <Route path="/instructors" element={<Instructors />} />
              <Route path="/instructors/:slug" element={<InstructorDetail />} />
              <Route path="/free-content" element={<FreeContent />} />
              <Route path="/free-content/:slug" element={<ArticleDetail />} />
              <Route path="/dictionary" element={<Dictionary />} />
              <Route path="/rules" element={<Rules />} />

              {/* AI Chat — requires auth, redirects to /auth if not logged in */}
              <Route path="/ai-chat" element={<AIChat />} />

              {/* Authenticated */}
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/complete-profile"
                element={
                  <RequireAuth>
                    <ProfileCompletion />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <Admin />
                  </RequireAuth>
                }
              />

              {/* AI Management Panel — admin/site_admin only */}
              <Route
                path="/panel/ai-management"
                element={
                  <RoleGate allowed={["admin", "site_admin"]} title="ai management">
                    <AIManagementPanel />
                  </RoleGate>
                }
              />

              {/* Super Admin Panel — admin only with password gate */}
              <Route
                path="/panel/super-admin"
                element={
                  <RoleGate allowed={["admin"]} title="super admin">
                    <SuperAdminPanel />
                  </RoleGate>
                }
              />

              {/* Telegram Bot Panel — admin/site_admin only */}
              <Route
                path="/panel/telegram-bot"
                element={
                  <RoleGate allowed={["admin", "site_admin"]} title="telegram bot">
                    <TelegramBotPanel />
                  </RoleGate>
                }
              />

              {/* Telegram Admin Center — admin/site_admin only */}
              <Route
                path="/panel/telegram-admin"
                element={
                  <RoleGate allowed={["admin", "site_admin"]} title="telegram admin">
                    <TelegramAdminCenter />
                  </RoleGate>
                }
              />

              {/* Role-specific panels — each role gets its own workspace */}
              <Route
                path="/panel/instructor"
                element={
                  <RoleGate allowed={["instructor", "admin", "site_admin"]} title="instructor studio">
                    <InstructorPanel />
                  </RoleGate>
                }
              />
              <Route
                path="/panel/mentor"
                element={
                  <RoleGate allowed={["mentor", "admin", "site_admin"]} title="mentor desk">
                    <MentorPanel />
                  </RoleGate>
                }
              />
              <Route
                path="/panel/support"
                element={
                  <RoleGate allowed={["support", "admin", "site_admin"]} title="support desk">
                    <SupportPanel />
                  </RoleGate>
                }
              />
              <Route
                path="/panel/content"
                element={
                  <RoleGate allowed={["content_manager", "admin", "site_admin"]} title="content studio">
                    <ContentPanel />
                  </RoleGate>
                }
              />

              {/* CMS Content Studio — rich text editor with TipTap */}
              <Route
                path="/panel/content-studio"
                element={
                  <RoleGate allowed={["content_manager", "admin", "site_admin"]} title="content studio">
                    <ContentStudio />
                  </RoleGate>
                }
              />

                            {/* Telegram Mini App (public) */}
              <Route path="/mini" element={<TelegramMiniApp />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
      </AuthProvider>
      </SettingsProvider>
    </InstrumentationProvider>
  </StrictMode>,
);
