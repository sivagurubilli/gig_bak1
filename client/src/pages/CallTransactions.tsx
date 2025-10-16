import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Phone, Video, Clock, DollarSign, Star, Crown, User } from "lucide-react";
import { format } from "date-fns";

interface CallTransaction {
  id: string;
  callId: string;
  callerId: string;
  callerName: string;
  callerGender: string;
  callerProfileType: string;
  receiverId: string;
  receiverName: string;
  receiverGender: string;
  receiverProfileType: string;
  callType: "video" | "audio" | "message";
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  coinsPerMinute: number;
  totalCoins: number;
  adminCommission: number;
  adminCommissionPercent: number;
  commissionType: "admin" | "gstar" | "gicon" | "none";
  receiverEarnings: number;
  status: "initiated" | "connected" | "ended" | "failed";
  paymentProcessed: boolean;
  paymentDetails: {
    callerPaid: number;
    receiverEarned: number;
    adminEarned: number;
    isPayableCall: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export default function CallTransactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [callTypeFilter, setCallTypeFilter] = useState<string>("all");

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/call-transactions"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/call-transactions/stats"],
  });

  // Filter transactions based on search and filters
  const filteredTransactions = transactions?.filter((transaction: CallTransaction) => {
    const matchesSearch = 
      transaction.callerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.receiverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.callId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    const matchesCallType = callTypeFilter === "all" || transaction.callType === callTypeFilter;
    
    return matchesSearch && matchesStatus && matchesCallType;
  }) || [];

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ended":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "connected":
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
      case "initiated":
        return <Badge className="bg-yellow-100 text-yellow-800">Initiated</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  // Helper function to get profile type icon
  const getProfileIcon = (profileType: string) => {
    switch (profileType) {
      case "gstar":
        return <Star className="h-3 w-3 text-yellow-500" />;
      case "gicon":
        return <Crown className="h-3 w-3 text-purple-500" />;
      default:
        return <User className="h-3 w-3 text-gray-500" />;
    }
  };

  // Helper function to get commission type badge
  const getCommissionBadge = (commissionType: string, rate: number) => {
    switch (commissionType) {
      case "gstar":
        return <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Star className="h-3 w-3" /> Gstar {rate}%
        </Badge>;
      case "gicon":
        return <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
          <Crown className="h-3 w-3" /> Gicon {rate}%
        </Badge>;
      case "admin":
        return <Badge className="bg-blue-100 text-blue-800">Admin {rate}%</Badge>;
      case "none":
        return <Badge className="bg-gray-100 text-gray-800">No Commission</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{commissionType}</Badge>;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getCallTypeIcon = (type: string) => {
    return type === "video" ? (
      <Video className="h-4 w-4 text-blue-500" />
    ) : (
      <Phone className="h-4 w-4 text-green-500" />
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Call Transactions</h1>
            <p className="text-muted-foreground">
              Monitor all call activities, earnings, and commission details
            </p>
          </div>
        </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCalls}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.callsToday} today
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.totalDuration)}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatDuration(stats.avgDuration)} per call
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRevenue} coins</div>
              <p className="text-xs text-muted-foreground">
                +{stats.revenueToday} today
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Commission</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCommission} coins</div>
              <p className="text-xs text-muted-foreground">
                {stats.avgCommissionPercent}% average rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter call transactions by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by caller, receiver, or session ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ended">Completed</SelectItem>
                <SelectItem value="connected">Active</SelectItem>
                <SelectItem value="initiated">Initiated</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={callTypeFilter} onValueChange={setCallTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Call Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="video">Video Calls</SelectItem>
                <SelectItem value="audio">Audio Calls</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Call Transactions ({filteredTransactions.length})</CardTitle>
          <CardDescription>
            Detailed breakdown of all call transactions with earnings and balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Call Info</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Duration & Cost</TableHead>
                  <TableHead>Payment Flow</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction: CallTransaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getCallTypeIcon(transaction.callType)}
                        <div>
                          <div className="font-medium">
                            {transaction.callType === "video" ? "Video Call" : "Audio Call"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {transaction.callId.slice(0, 8)}...
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(transaction.startTime), "MMM dd, HH:mm")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {transaction.callerGender === "male" ? "♂" : "♀"}
                          </Badge>
                          {getProfileIcon(transaction.callerProfileType)}
                          <span className="font-medium text-sm">{transaction.callerName}</span>
                          <span className="text-xs text-muted-foreground">(Caller)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {transaction.receiverGender === "male" ? "♂" : "♀"}
                          </Badge>
                          {getProfileIcon(transaction.receiverProfileType)}
                          <span className="font-medium text-sm">{transaction.receiverName}</span>
                          <span className="text-xs text-muted-foreground">(Receiver)</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{formatDuration(transaction.duration)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {transaction.coinsPerMinute} coins/min
                        </div>
                        <div className="text-xs font-medium">
                          Total: {transaction.totalCoins} coins
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span>Caller Paid:</span>
                          <span className="font-medium text-red-600">
                            -{transaction.paymentDetails?.callerPaid || transaction.totalCoins} coins
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Admin Earned:</span>
                          <span className="font-medium text-orange-600">
                            +{transaction.paymentDetails?.adminEarned || transaction.adminCommission} coins
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Receiver Earned:</span>
                          <span className="font-medium text-green-600">
                            +{transaction.paymentDetails?.receiverEarned || transaction.receiverEarnings} coins
                          </span>
                        </div>
                        {!transaction.paymentDetails?.isPayableCall && (
                          <div className="text-xs text-gray-500 italic">
                            (Non-payable call combination)
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getCommissionBadge(transaction.commissionType, transaction.adminCommissionPercent)}
                        {transaction.paymentDetails?.isPayableCall && (
                          <div className="text-xs text-muted-foreground">
                            Male → Female ({transaction.receiverProfileType})
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(transaction.status)}
                        {transaction.paymentProcessed && (
                          <div className="text-xs text-green-600">✓ Paid</div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No call transactions found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
}