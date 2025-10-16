import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  Coins,
  CreditCard,
  Trophy,
  Gift,
  Shield,
  FileText,
  Star,
  BookOpen,
  LogOut,
  Crown,
  Settings,
  Phone,
  Image,
  Monitor,
  Package,
} from "lucide-react";

const menuItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/users", label: "User Management", icon: Users },
  { path: "/wallet", label: "Wallet & Coins", icon: Coins },
  { path: "/coin-packages", label: "Coin Packages", icon: Package },
  { path: "/withdrawals", label: "Withdrawals", icon: CreditCard },
  { path: "/call-config", label: "Call Configuration", icon: Settings },
  { path: "/call-transactions", label: "Call Transactions", icon: Phone },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { path: "/gifts", label: "Gift Management", icon: Gift },
  { path: "/moderation", label: "Moderation", icon: Shield },
  { path: "/payment-logs", label: "Payment Logs", icon: FileText },
  { path: "/documents", label: "Documents", icon: BookOpen },
  { path: "/banners", label: "Banner Management", icon: Monitor },
  { path: "/profile-picture-approval", label: "Profile Approvals", icon: Image },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { admin, logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:static lg:inset-0 lg:translate-x-0 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-center h-16 gradient-bg flex-shrink-0">
          <h1 className="text-xl font-bold text-white flex items-center">
            <Crown className="mr-2 h-6 w-6" />
            Gigglebuz Admin
          </h1>
        </div>
        
        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto mt-4 px-4 space-y-2 pb-4 sidebar-scroll">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => onClose()}
                className={cn("sidebar-item", { active: isActive })}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* Admin Profile */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="gradient-card-bg p-3 rounded-lg">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150" />
                <AvatarFallback>{admin?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{admin?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{admin?.role.replace('_', ' ')}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-gray-400 hover:text-gray-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Company Footer */}
        <div className="flex-shrink-0 p-3 border-t border-gray-100 bg-gray-50">
          <div className="text-center text-xs text-gray-500">
            <p className="font-medium text-gray-600 mb-1">Developed by</p>
            <p className="font-semibold text-gray-700">Ramadurga Srinadh</p>
            <a 
              href="https://techweblabs.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-medium block mt-1"
            >
              Techweblabs
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
