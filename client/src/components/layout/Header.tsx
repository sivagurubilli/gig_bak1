import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Menu, Search, Bell, Plus, Users, Gift, Package, MessageSquare, Award } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  const [, setLocation] = useLocation();

  // Fetch notification count
  const { data: notificationCount } = useQuery({
    queryKey: ["/api/notifications/count"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const quickActions = [
    {
      icon: Package,
      label: "Add Coin Package", 
      action: () => setLocation("/coin-packages"),
      description: "Create new coin package"
    },
    {
      icon: Gift,
      label: "Add Gift",
      action: () => setLocation("/gifts"),
      description: "Add new gift to catalog"
    }
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden mr-4"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-2xl font-bold gradient-text">{title}</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative"
            onClick={() => setLocation("/profile-picture-approval")}
            title="Profile Approval Notifications"
          >
            <Bell className="h-5 w-5 text-gray-500" />
            {notificationCount?.total > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {notificationCount.total}
              </Badge>
            )}
          </Button>
          
          {/* Quick Action */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gradient-bg text-white hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Quick Action
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {quickActions.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={action.action}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
                >
                  <action.icon className="h-4 w-4 text-gray-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">{action.label}</span>
                    <span className="text-xs text-gray-500">{action.description}</span>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setLocation("/dashboard")}
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
              >
                <Search className="h-4 w-4 text-gray-500" />
                <div className="flex flex-col">
                  <span className="font-medium">View Dashboard</span>
                  <span className="text-xs text-gray-500">Go to main dashboard</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
