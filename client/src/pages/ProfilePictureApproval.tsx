import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye, Calendar, User } from "lucide-react";

interface ProfilePictureRequest {
  id: string;
  userId: string;
  imageUrl: string;
  status: string;
  submittedAt: string;
  userDetails: {
    name: string;
    username: string;
    email?: string;
    gender: string;
  };
}

export default function ProfilePictureApproval() {
  const [selectedRequest, setSelectedRequest] = useState<ProfilePictureRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper function to get the correct image URL for both Firebase Storage URLs and local uploads
  const getImageUrl = (imageUrl: string) => {
    // If it's already a complete URL (Firebase Storage), use it as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // If it's a relative path (local upload), prefix with server URL
    return `http://localhost:5000${imageUrl}`;
  };

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['/api/profile-picture-requests'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => 
      apiRequest("POST", `/api/profile-picture-requests/${requestId}/approve`),
    onSuccess: (_, requestId) => {
      toast({
        title: "Profile Picture Approved",
        description: "The profile picture has been approved and updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profile-picture-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.response?.data?.error || "Failed to approve profile picture",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      apiRequest("POST", `/api/profile-picture-requests/${requestId}/reject`, { reason }),
    onSuccess: (_, { requestId }) => {
      toast({
        title: "Profile Picture Rejected",
        description: "The profile picture has been rejected.",
      });
      setShowRejectDialog(false);
      setRejectReason("");
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ['/api/profile-picture-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.response?.data?.error || "Failed to reject profile picture",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (requestId: string) => {
    approveMutation.mutate(requestId);
  };

  const handleReject = () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({ requestId: selectedRequest.id, reason: rejectReason });
  };

  const openRejectDialog = (request: ProfilePictureRequest) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Profile Picture Approval">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Profile Picture Approval">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile Picture Approval</h1>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {requests.length} Pending Requests
        </Badge>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Pending Requests</h3>
            <p className="text-gray-600">All profile picture requests have been processed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((request: ProfilePictureRequest) => (
            <Card key={request.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {request.userDetails.name}
                  </CardTitle>
                  <Badge variant="outline">
                    {request.userDetails.gender}
                  </Badge>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-1" />
                  {request.userDetails.username}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(request.submittedAt).toLocaleDateString()}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Profile Picture Preview */}
                <div className="relative">
                  <img
                    src={getImageUrl(request.imageUrl)}
                    alt="Profile Picture"
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Full Size Preview</DialogTitle>
                      </DialogHeader>
                      <img
                        src={getImageUrl(request.imageUrl)}
                        alt="Profile Picture Full Size"
                        className="w-full max-h-96 object-contain rounded-lg"
                      />
                    </DialogContent>
                  </Dialog>
                </div>

                {/* User Details */}
                {request.userDetails.email && (
                  <p className="text-sm text-gray-600">
                    Email: {request.userDetails.email}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(request.id)}
                    disabled={approveMutation.isPending}
                    className="flex-1"
                    variant="default"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => openRejectDialog(request)}
                    disabled={rejectMutation.isPending}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please provide a reason for rejecting this profile picture:
            </p>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason("");
                  setSelectedRequest(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                variant="destructive"
              >
                {rejectMutation.isPending ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </AdminLayout>
  );
}