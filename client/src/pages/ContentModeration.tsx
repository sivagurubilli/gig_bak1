import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Shield, Search, AlertTriangle, CheckCircle, XCircle, Clock, Ban, AlertOctagon } from "lucide-react";
import type { Report, User } from "@shared/schema";

export default function ContentModeration() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [action, setAction] = useState("");
  const [remarks, setRemarks] = useState("");
  const { toast } = useToast();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["/api/reports"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, status, action, remarks }: { id: number; status: string; action?: string; remarks?: string }) => {
      return apiRequest("PATCH", `/api/reports/${id}`, { status, action, remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      setIsDialogOpen(false);
      setSelectedReport(null);
      setAction("");
      setRemarks("");
      toast({
        title: "Success",
        description: "Report processed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process report",
        variant: "destructive",
      });
    },
  });

  const handleAction = (report: Report, actionType: string) => {
    setSelectedReport(report);
    setAction(actionType);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedReport) return;
    
    updateReportMutation.mutate({
      id: selectedReport.id,
      status: "resolved",
      action,
      remarks,
    });
  };

  const handleDismiss = (report: Report) => {
    updateReportMutation.mutate({
      id: report.id,
      status: "dismissed",
      remarks: "Report dismissed after review",
    });
  };

  const filteredReports = reports?.filter((report: Report) => {
    if (!searchQuery) return true;
    const reportedUser = users?.find((u: User) => u.id === report.reportedUserId);
    const reporter = users?.find((u: User) => u.id === report.reporterId);
    return reportedUser?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           reporter?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           report.reason.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const getUserName = (userId: number) => {
    const user = users?.find((u: User) => u.id === userId);
    return user ? `${user.name} (@${user.username})` : `User ${userId}`;
  };

  const getUser = (userId: number) => {
    return users?.find((u: User) => u.id === userId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'resolved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
      case 'suspension':
        return <Badge className="bg-orange-100 text-orange-800"><Ban className="h-3 w-3 mr-1" />Suspension</Badge>;
      case 'permanent_block':
        return <Badge variant="destructive"><AlertOctagon className="h-3 w-3 mr-1" />Permanent Block</Badge>;
      default:
        return null;
    }
  };

  const pendingCount = reports?.filter((r: Report) => r.status === 'pending').length || 0;
  const resolvedCount = reports?.filter((r: Report) => r.status === 'resolved').length || 0;
  const totalReports = reports?.length || 0;

  return (
    <AdminLayout title="Content Moderation">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Pending Reports</p>
                  <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Resolved Reports</p>
                  <p className="text-3xl font-bold text-green-600">{resolvedCount}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Reports</p>
                  <p className="text-3xl font-bold text-gray-900">{totalReports}</p>
                </div>
                <div className="gradient-bg p-3 rounded-lg">
                  <Shield className="h-6 w-6 text-white" />
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
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-96"
            />
          </div>
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Reports ({filteredReports.length})</CardTitle>
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
                    <TableHead>Reporter</TableHead>
                    <TableHead>Reported User</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action Taken</TableHead>
                    <TableHead>Reported</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report: Report) => {
                    const reportedUser = getUser(report.reportedUserId);
                    const reporter = getUser(report.reporterId);
                    
                    return (
                      <TableRow key={report.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={reporter?.avatar} />
                              <AvatarFallback>{reporter?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm">
                              <p className="font-medium">{reporter?.name}</p>
                              <p className="text-gray-500">@{reporter?.username}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={reportedUser?.avatar} />
                              <AvatarFallback>{reportedUser?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm">
                              <p className="font-medium">{reportedUser?.name}</p>
                              <p className="text-gray-500">@{reportedUser?.username}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.reason}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-gray-500 truncate">
                            {report.description || "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(report.status)}
                        </TableCell>
                        <TableCell>
                          {report.action ? getActionBadge(report.action) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(report.createdAt)}
                        </TableCell>
                        <TableCell>
                          {report.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                onClick={() => handleAction(report, "warning")}
                              >
                                Warn
                              </Button>
                              <Button
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={() => handleAction(report, "suspension")}
                              >
                                Suspend
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction(report, "permanent_block")}
                              >
                                Block
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDismiss(report)}
                              >
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            
            {!isLoading && filteredReports.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No reports found</p>
                <p className="text-sm">All clear! No content moderation issues to review.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Take Moderation Action
              </DialogTitle>
            </DialogHeader>
            
            {selectedReport && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Reported User:</strong> {getUserName(selectedReport.reportedUserId)}</p>
                  <p><strong>Reason:</strong> {selectedReport.reason}</p>
                  <p><strong>Description:</strong> {selectedReport.description || "No description provided"}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action to Take
                  </label>
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="suspension">Temporary Suspension</SelectItem>
                      <SelectItem value="permanent_block">Permanent Block</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks (Optional)
                  </label>
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add remarks about this action..."
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    className="flex-1 gradient-bg text-white"
                    onClick={handleSubmit}
                    disabled={updateReportMutation.isPending || !action}
                  >
                    {updateReportMutation.isPending ? "Processing..." : "Take Action"}
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
