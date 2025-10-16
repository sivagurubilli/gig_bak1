import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";
import { Trophy, Crown, Star, Gift, Medal, Award } from "lucide-react";
import type { User, GiftTransaction } from "@shared/schema";

export default function Leaderboard() {
  const [leaderboardType, setLeaderboardType] = useState("gifter");
  const [period, setPeriod] = useState("monthly");

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: giftTransactions } = useQuery({
    queryKey: ["/api/gifts/transactions"],
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ["/api/leaderboard", leaderboardType, period],
  });

  // Calculate top gifters (users who send most gifts)
  const getTopGifters = () => {
    if (!giftTransactions || !users) return [];
    
    // Handle both array and object responses
    const transactions = Array.isArray(giftTransactions) ? giftTransactions : giftTransactions.transactions || [];
    
    const gifterStats = transactions.reduce((acc: any, transaction: GiftTransaction) => {
      if (!acc[transaction.senderId]) {
        acc[transaction.senderId] = {
          userId: transaction.senderId,
          totalCoins: 0,
          giftCount: 0,
        };
      }
      acc[transaction.senderId].totalCoins += transaction.coinValue;
      acc[transaction.senderId].giftCount += 1;
      return acc;
    }, {});

    return Object.values(gifterStats)
      .sort((a: any, b: any) => b.totalCoins - a.totalCoins)
      .slice(0, 10)
      .map((stat: any, index) => {
        const user = users.find((u: User) => u.id === stat.userId);
        return {
          rank: index + 1,
          user,
          value: stat.totalCoins,
          extra: `${stat.giftCount} gifts sent`,
        };
      });
  };

  // Calculate top earners (users who receive most gifts)
  const getTopEarners = () => {
    if (!giftTransactions || !users) return [];
    
    // Handle both array and object responses
    const transactions = Array.isArray(giftTransactions) ? giftTransactions : giftTransactions.transactions || [];
    
    const earnerStats = transactions.reduce((acc: any, transaction: GiftTransaction) => {
      if (!acc[transaction.receiverId]) {
        acc[transaction.receiverId] = {
          userId: transaction.receiverId,
          totalCoins: 0,
          giftCount: 0,
        };
      }
      acc[transaction.receiverId].totalCoins += transaction.coinValue;
      acc[transaction.receiverId].giftCount += 1;
      return acc;
    }, {});

    return Object.values(earnerStats)
      .sort((a: any, b: any) => b.totalCoins - a.totalCoins)
      .slice(0, 10)
      .map((stat: any, index) => {
        const user = users.find((u: User) => u.id === stat.userId);
        return {
          rank: index + 1,
          user,
          value: stat.totalCoins,
          extra: `${stat.giftCount} gifts received`,
        };
      });
  };

  const getCurrentLeaderboard = () => {
    switch (leaderboardType) {
      case "gifter":
        return getTopGifters();
      case "earner":
        return getTopEarners();
      default:
        return [];
    }
  };

  const leaderboard = getCurrentLeaderboard();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-yellow-100 text-yellow-800">🥇 1st Place</Badge>;
      case 2:
        return <Badge className="bg-gray-100 text-gray-800">🥈 2nd Place</Badge>;
      case 3:
        return <Badge className="bg-amber-100 text-amber-800">🥉 3rd Place</Badge>;
      default:
        return <Badge variant="outline">#{rank}</Badge>;
    }
  };

  return (
    <AdminLayout title="Leaderboard Management">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-4">
            <Select value={leaderboardType} onValueChange={setLeaderboardType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gifter">Top Gifters</SelectItem>
                <SelectItem value="earner">Top Earners</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button className="gradient-bg text-white">
            <Trophy className="h-4 w-4 mr-2" />
            Update Rankings
          </Button>
        </div>

        {/* Top 3 Spotlight */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 2nd Place */}
            <Card className="card-hover order-2 md:order-1">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <Medal className="h-12 w-12 text-gray-400" />
                </div>
                <Avatar className="w-16 h-16 mx-auto mb-4">
                  <AvatarImage src={leaderboard[1]?.user?.avatar} />
                  <AvatarFallback>{leaderboard[1]?.user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{leaderboard[1]?.user?.name}</h3>
                <p className="text-gray-500 text-sm mb-2">@{leaderboard[1]?.user?.username}</p>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {leaderboard[1]?.value?.toLocaleString()} coins
                </div>
                <p className="text-sm text-gray-500">{leaderboard[1]?.extra}</p>
              </CardContent>
            </Card>

            {/* 1st Place */}
            <Card className="card-hover order-1 md:order-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <Crown className="h-16 w-16 text-yellow-500" />
                </div>
                <Avatar className="w-20 h-20 mx-auto mb-4 ring-4 ring-yellow-200">
                  <AvatarImage src={leaderboard[0]?.user?.avatar} />
                  <AvatarFallback>{leaderboard[0]?.user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-xl">{leaderboard[0]?.user?.name}</h3>
                <p className="text-gray-500 text-sm mb-2">@{leaderboard[0]?.user?.username}</p>
                <div className="text-3xl font-bold text-yellow-600 mb-1">
                  {leaderboard[0]?.value?.toLocaleString()} coins
                </div>
                <p className="text-sm text-gray-500">{leaderboard[0]?.extra}</p>
                <Badge className="mt-2 bg-yellow-100 text-yellow-800">👑 Champion</Badge>
              </CardContent>
            </Card>

            {/* 3rd Place */}
            <Card className="card-hover order-3">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <Award className="h-12 w-12 text-amber-600" />
                </div>
                <Avatar className="w-16 h-16 mx-auto mb-4">
                  <AvatarImage src={leaderboard[2]?.user?.avatar} />
                  <AvatarFallback>{leaderboard[2]?.user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{leaderboard[2]?.user?.name}</h3>
                <p className="text-gray-500 text-sm mb-2">@{leaderboard[2]?.user?.username}</p>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {leaderboard[2]?.value?.toLocaleString()} coins
                </div>
                <p className="text-sm text-gray-500">{leaderboard[2]?.extra}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              {leaderboardType === "gifter" ? "Top Gifters" : "Top Earners"} - {period.charAt(0).toUpperCase() + period.slice(1)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Total Coins</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry, index) => (
                  <TableRow key={entry.user?.id || index} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center">
                        {getRankIcon(entry.rank)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={entry.user?.avatar} />
                          <AvatarFallback>{entry.user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{entry.user?.name}</p>
                          <p className="text-sm text-gray-500">@{entry.user?.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="font-semibold text-lg">
                          {entry.value.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-500">{entry.extra}</p>
                    </TableCell>
                    <TableCell>
                      {getRankBadge(entry.rank)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {leaderboard.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No leaderboard data available</p>
                <p className="text-sm">Users need to send/receive gifts to appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
