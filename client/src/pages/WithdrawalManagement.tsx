import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, Check, X, Clock, CreditCard } from "lucide-react";
import type { WithdrawalRequest, User } from "@shared/schema";

export default function WithdrawalManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const { toast } = useToast();

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["/api/withdrawals"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: number; status: string; remarks: string }) => {
      return apiRequest("PATCH", `/api/withdrawals/${id}`, { status, remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      setIsDialogOpen(false);
      setSelectedWithdrawal(null);
      setRemarks("");
      toast({
        title: "Success",
        description: "Withdrawal request updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update withdrawal request",
        variant: "destructive",
      });
    },
  });

  const handleAction = (withdrawal: WithdrawalRequest, actionType: "approve" | "reject") => {
    setSelectedWithdrawal(withdrawal);
    setAction(actionType);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedWithdrawal) return;
    
    updateWithdrawalMutation.mutate({
      id: selectedWithdrawal.id,
      status: action === "approve" ? "approved" : "rejected",
      remarks,
    });
  };

  const filteredWithdrawals = withdrawals?.filter((withdrawal: WithdrawalRequest) => {
    if (!searchQuery) return true;
    const user = users?.find((u: User) => u.id === withdrawal.userId);
    return user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (withdrawal.coinAmount && withdrawal.coinAmount.toString().includes(searchQuery)) ||
           (withdrawal.rupeeAmount && withdrawal.rupeeAmount.toString().includes(searchQuery));
  }) || [];

  const getUserName = (userId: number) => {
    const user = users?.find((u: User) => u.id === userId);
    return user ? `${user.name} (@${user.username})` : `User ${userId}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = withdrawals?.filter((w: WithdrawalRequest) => w.status === 'pending').length || 0;
  const totalAmount = withdrawals?.reduce((sum: number, w: WithdrawalRequest) => sum + parseFloat(w.rupeeAmount || w.amount || "0"), 0) || 0;
  const totalCoins = withdrawals?.reduce((sum: number, w: WithdrawalRequest) => sum + (w.coinAmount || 0), 0) || 0;

  return (
    <AdminLayout title="Withdrawal Management">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Pending Requests</p>
                  <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Requests</p>
                  <p className="text-3xl font-bold text-gray-900">{withdrawals?.length || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
                  <p className="text-sm text-gray-600">{totalCoins} coins @ 10:1 ratio</p>
                </div>
                <div className="gradient-bg p-3 rounded-lg">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search withdrawals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-96"
            />
          </div>
        </div>

        {/* Withdrawals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Requests ({filteredWithdrawals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Coins</TableHead>
                    <TableHead>Amount (₹)</TableHead>
                    <TableHead>Account Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWithdrawals.map((withdrawal: WithdrawalRequest) => (
                    <TableRow key={withdrawal.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium">
                          {getUserName(withdrawal.userId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-blue-600">
                          {withdrawal.coinAmount || 'N/A'} coins
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">
                          ₹{withdrawal.rupeeAmount || formatCurrency(withdrawal.amount)}
                        </span>
                        <div className="text-xs text-gray-500">
                          {withdrawal.coinAmount ? `${withdrawal.coinAmount} ÷ 10` : 'Legacy'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 capitalize">
                            {withdrawal.accountType || 'N/A'}
                          </div>
                          {withdrawal.accountDetails && (
                            <div className="text-xs text-gray-600 mt-1">
                              {(() => {
                                try {
                                  const details = typeof withdrawal.accountDetails === 'string' 
                                    ? JSON.parse(withdrawal.accountDetails) 
                                    : withdrawal.accountDetails;
                                  
                                  if (withdrawal.accountType === 'upi') {
                                    return details.upiId || 'N/A';
                                  } else if (withdrawal.accountType === 'bank') {
                                    return (
                                      <div>
                                        <div>A/c: {details.accountNumber || 'N/A'}</div>
                                        <div>IFSC: {details.ifscCode || 'N/A'}</div>
                                        <div>Name: {details.accountHolder || 'N/A'}</div>
                                      </div>
                                    );
                                  } else if (withdrawal.accountType === 'paytm') {
                                    return details.paytmNumber || 'N/A';
                                  }
                                  return 'N/A';
                                } catch (e) {
                                  return 'Invalid data';
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(withdrawal.status)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(withdrawal.createdAt)}
                        {withdrawal.remarks && (
                          <div className="text-xs text-gray-400 truncate max-w-24">
                            {withdrawal.remarks}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {withdrawal.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleAction(withdrawal, "approve")}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(withdrawal, "reject")}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {!isLoading && filteredWithdrawals.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No withdrawal requests found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {action === "approve" ? "Approve" : "Reject"} Withdrawal Request
              </DialogTitle>
            </DialogHeader>
            
            {selectedWithdrawal && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>User:</strong> {getUserName(selectedWithdrawal.userId)}</p>
                  <p><strong>Coins:</strong> {selectedWithdrawal.coinAmount || 'N/A'} coins</p>
                  <p><strong>Amount:</strong> ₹{selectedWithdrawal.rupeeAmount || formatCurrency(selectedWithdrawal.amount)}</p>
                  <p><strong>Conversion:</strong> {selectedWithdrawal.coinAmount ? `${selectedWithdrawal.coinAmount} coins ÷ 10 = ₹${selectedWithdrawal.rupeeAmount}` : 'Legacy withdrawal'}</p>
                  <p><strong>Requested:</strong> {formatDate(selectedWithdrawal.createdAt)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks {action === "reject" && <span className="text-red-500">*</span>}
                  </label>
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder={`Add remarks for ${action === "approve" ? "approval" : "rejection"}...`}
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    className={action === "approve" ? "bg-green-600 hover:bg-green-700 text-white flex-1" : "flex-1"}
                    variant={action === "approve" ? "default" : "destructive"}
                    onClick={handleSubmit}
                    disabled={updateWithdrawalMutation.isPending || (action === "reject" && !remarks.trim())}
                  >
                    {updateWithdrawalMutation.isPending ? "Processing..." : 
                     action === "approve" ? "Approve Request" : "Reject Request"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
