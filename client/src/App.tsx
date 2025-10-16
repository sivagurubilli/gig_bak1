import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import UserManagement from "@/pages/UserManagement";
import WalletManagement from "@/pages/WalletManagement";
import WithdrawalManagement from "@/pages/WithdrawalManagement";
import CoinPackages from "@/pages/CoinPackages";
import Leaderboard from "@/pages/Leaderboard";
import GiftManagement from "@/pages/GiftManagement";
import ContentModeration from "@/pages/ContentModeration";
import ProfilePictureApproval from "@/pages/ProfilePictureApproval";
import PaymentLogs from "@/pages/PaymentLogs";
import BonusManagement from "@/pages/BonusManagement";
import DocumentManagement from "@/pages/DocumentManagement";
import BannerManagement from "@/pages/BannerManagement";
import CallConfig from "@/pages/CallConfig";
import CallTransactions from "@/pages/CallTransactions";

// Update query client to include auth headers
const originalQueryFn = queryClient.getDefaultOptions().queries?.queryFn;
queryClient.setDefaultOptions({
  queries: {
    ...queryClient.getDefaultOptions().queries,
    queryFn: async (context) => {
      const token = localStorage.getItem("token");
      const url = context.queryKey[0] as string;
      
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        const text = (await response.text()) || response.statusText;
        throw new Error(`${response.status}: ${text}`);
      }

      return await response.json();
    },
  },
});

// Update apiRequest to include auth headers
export const apiRequest = async (
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> => {
  const token = localStorage.getItem("token");
  
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || res.statusText);
  }

  return await res.json();
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!admin) {
    return <Login />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected routes */}
      <Route path="/">
        {() => (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/users">
        {() => (
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/user-management">
        {() => (
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/wallet">
        {() => (
          <ProtectedRoute>
            <WalletManagement />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/wallet-management">
        {() => (
          <ProtectedRoute>
            <WalletManagement />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/withdrawals">
        {() => (
          <ProtectedRoute>
            <WithdrawalManagement />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/coin-packages">
        {() => (
          <ProtectedRoute>
            <CoinPackages />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/call-config">
        {() => (
          <ProtectedRoute>
            <CallConfig />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/leaderboard">
        {() => (
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/gifts">
        {() => (
          <ProtectedRoute>
            <GiftManagement />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/moderation">
        {() => (
          <ProtectedRoute>
            <ContentModeration />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/payment-logs">
        {() => (
          <ProtectedRoute>
            <PaymentLogs />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/bonus-rules">
        {() => (
          <ProtectedRoute>
            <BonusManagement />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/documents">
        {() => (
          <ProtectedRoute>
            <DocumentManagement />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/banners">
        {() => (
          <ProtectedRoute>
            <BannerManagement />
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/call-transactions">
        {() => (
          <ProtectedRoute>
            <CallTransactions />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/profile-picture-approval">
        {() => (
          <ProtectedRoute>
            <ProfilePictureApproval />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
