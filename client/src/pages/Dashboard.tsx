import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Radio, CreditCard, ArrowUp, Clock, Plus, Minus, Gift, Crown, Star, Heart, ChartLine, TrendingUp } from "lucide-react";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["/api/withdrawals"],
  });

  const { data: walletTransactions } = useQuery({
    queryKey: ["/api/wallet/transactions"],
  });

  const recentUsers = users?.slice(0, 3) || [];
  const recentTransactions = walletTransactions?.slice(0, 3) || [];
  const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').slice(0, 3) || [];

  return (
    <AdminLayout title="Dashboard Overview">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers?.toLocaleString() || "0"}
          change={"+12.5% from last month"}
          changeType="positive"
          icon={<Users className="text-white text-xl" />}
          iconBg="gradient-bg"
          borderColor="border-primary"
        />
        
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || "0")}
          change={"+8.2% from last month"}
          changeType="positive"
          icon={<DollarSign className="text-white text-xl" />}
          iconBg="bg-green-500"
          borderColor="border-green-500"
        />
        
        <StatsCard
          title="Active Sessions"
          value={stats?.activeSessions?.toLocaleString() || "0"}
          change="Live data"
          changeType="neutral"
          icon={<Radio className="text-white text-xl" />}
          iconBg="bg-blue-500"
          borderColor="border-blue-500"
        />
        
        <StatsCard
          title="Pending Withdrawals"
          value={stats?.pendingWithdrawals || "0"}
          change="Requires attention"
          changeType="neutral"
          icon={<CreditCard className="text-white text-xl" />}
          iconBg="bg-orange-500"
          borderColor="border-orange-500"
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Revenue Overview</CardTitle>
            <select className="bg-gray-100 border-0 rounded-lg px-3 py-1 text-sm">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 3 months</option>
            </select>
          </CardHeader>
          <CardContent>
            <div className="h-64 gradient-card-bg rounded-lg flex items-center justify-center">
              <div className="text-center">
                <ChartLine className="text-6xl text-primary mb-4 mx-auto" />
                <p className="text-gray-500">Revenue Chart</p>
                <p className="text-sm text-gray-400">Chart visualization will be here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Analytics */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>User Analytics</CardTitle>
            <select className="bg-gray-100 border-0 rounded-lg px-3 py-1 text-sm">
              <option>This month</option>
              <option>Last month</option>
              <option>This year</option>
            </select>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-primary rounded-full mr-3"></div>
                  <span className="text-gray-700">Male Users</span>
                </div>
                <span className="font-semibold">56%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">Female Users</span>
                </div>
                <span className="font-semibold">44%</span>
              </div>
              <div className="mt-6">
                <div className="bg-gray-200 rounded-full h-3">
                  <div className="gradient-bg h-3 rounded-full" style={{ width: '56%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Users</CardTitle>
            <Button variant="link" className="text-primary">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">
                      Joined {formatRelativeTime(user.createdAt)}
                    </p>
                  </div>
                  <Badge variant={user.isOnline ? "default" : "secondary"}>
                    {user.isOnline ? "Active" : "Offline"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="link" className="text-primary">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      transaction.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {transaction.type === 'credit' ? 
                        <Plus className={`h-4 w-4 ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`} /> :
                        <Minus className={`h-4 w-4 ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`} />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-500">
                        {formatRelativeTime(transaction.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold ${
                    transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'credit' ? '+' : '-'}{transaction.amount} coins
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Performers</CardTitle>
            <Button variant="link" className="text-primary">Leaderboard</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Crown className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Top Gifter</p>
                  <p className="text-sm text-gray-500">Mike Wilson - 2,450 coins</p>
                </div>
                <span className="text-2xl">🏆</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Star className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Top Earner</p>
                  <p className="text-sm text-gray-500">Anna Kim - $1,200</p>
                </div>
                <span className="text-2xl">⭐</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="bg-pink-100 p-2 rounded-lg">
                  <Heart className="h-4 w-4 text-pink-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Most Popular</p>
                  <p className="text-sm text-gray-500">Sofia Rodriguez - 850 followers</p>
                </div>
                <span className="text-2xl">💖</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Panel */}
      <Card className="mt-8 card-hover">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button variant="outline" className="gradient-card-bg hover:gradient-bg hover:text-white transition-all duration-300 p-4 h-auto flex flex-col items-center space-y-2">
              <Users className="h-6 w-6" />
              <span className="text-sm font-medium">Add User</span>
            </Button>
            
            <Button variant="outline" className="gradient-card-bg hover:gradient-bg hover:text-white transition-all duration-300 p-4 h-auto flex flex-col items-center space-y-2">
              <CreditCard className="h-6 w-6" />
              <span className="text-sm font-medium">Manage Coins</span>
            </Button>
            
            <Button variant="outline" className="gradient-card-bg hover:gradient-bg hover:text-white transition-all duration-300 p-4 h-auto flex flex-col items-center space-y-2">
              <Users className="h-6 w-6" />
              <span className="text-sm font-medium">Send Notification</span>
            </Button>
            
            <Button variant="outline" className="gradient-card-bg hover:gradient-bg hover:text-white transition-all duration-300 p-4 h-auto flex flex-col items-center space-y-2">
              <TrendingUp className="h-6 w-6" />
              <span className="text-sm font-medium">View Reports</span>
            </Button>
            
            <Button variant="outline" className="gradient-card-bg hover:gradient-bg hover:text-white transition-all duration-300 p-4 h-auto flex flex-col items-center space-y-2">
              <Users className="h-6 w-6" />
              <span className="text-sm font-medium">Moderate</span>
            </Button>
            
            <Button variant="outline" className="gradient-card-bg hover:gradient-bg hover:text-white transition-all duration-300 p-4 h-auto flex flex-col items-center space-y-2">
              <Gift className="h-6 w-6" />
              <span className="text-sm font-medium">Manage Gifts</span>
            </Button>

            <Button 
              variant="outline" 
              className="gradient-card-bg hover:gradient-bg hover:text-white transition-all duration-300 p-4 h-auto flex flex-col items-center space-y-2"
              onClick={() => window.location.href = '/profile-picture-approval'}
            >
              <Users className="h-6 w-6" />
              <span className="text-sm font-medium">Profile Approvals</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Developer Credits */}
      <div className="mt-8 text-center py-6 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          <p className="mb-2">
            <span className="font-semibold text-gray-700">Developed by Ramadurga Srinadh</span>
          </p>
          <p className="mb-1">
            <a 
              href="https://techweblabs.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Techweblabs
            </a>
          </p>
          <p className="text-gray-400">ramadurga@techweblabs.com</p>
        </div>
      </div>
    </AdminLayout>
  );
}
