import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/lib/utils";
import { Search, UserPlus, Shield, ShieldOff, Wallet, Eye, Star, Crown, X, RotateCcw } from "lucide-react";
import type { User } from "@shared/schema";
import { z } from "zod";
import { UserDetailsModal } from "@/components/UserDetailsModal";

const userFormSchema = insertUserSchema;

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users", searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/users?search=${encodeURIComponent(searchQuery)}` : "/api/users";
      const token = localStorage.getItem("token");
      const response = await fetch(url, { 
        credentials: "include",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Fetch wallets data
  const { data: wallets } = useQuery<any[]>({
    queryKey: ["/api/wallets"],
    enabled: true,
  });

  const getUserWalletBalance = (userId: number) => {
    if (!wallets || !Array.isArray(wallets)) return "0";
    const userWallet = wallets.find((w: any) => w.userId === userId);
    return userWallet && userWallet.coinBalance !== undefined ? userWallet.coinBalance.toLocaleString() : "0";
  };

  const handleWalletClick = (user: User) => {
    // Navigate to wallet management with user filter
    setLocation(`/wallet-management?userId=${user.id}`);
  };

  // Profile type update mutations
  const updateProfileTypeMutation = useMutation({
    mutationFn: async ({ userId, profileType, badgeLevel }: { userId: number, profileType: string, badgeLevel: number }) => {
      return apiRequest("PATCH", `/api/users/${userId}`, { profileType, badgeLevel });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "User profile type updated successfully" });
    },
    onError: (error) => {
      console.error("Profile type update error:", error);
      toast({ title: "Error", description: "Failed to update profile type", variant: "destructive" });
    }
  });

  const handlePromoteToGIcon = (user: User) => {
    updateProfileTypeMutation.mutate({
      userId: user.id,
      profileType: "gicon",
      badgeLevel: user.badgeLevel || 1
    });
  };

  const handlePromoteToGStar = (user: User) => {
    updateProfileTypeMutation.mutate({
      userId: user.id,
      profileType: "gstar",
      badgeLevel: user.badgeLevel || 1
    });
  };

  const handleUpgradeBadgeLevel = (user: User) => {
    const newLevel = Math.min((user.badgeLevel || 1) + 1, 10);
    updateProfileTypeMutation.mutate({
      userId: user.id,
      profileType: user.profileType,
      badgeLevel: newLevel
    });
  };

  const handleDowngradeBadgeLevel = (user: User) => {
    const newLevel = Math.max((user.badgeLevel || 1) - 1, 1);
    updateProfileTypeMutation.mutate({
      userId: user.id,
      profileType: user.profileType,
      badgeLevel: newLevel
    });
  };

  const handleRemoveGIcon = (user: User) => {
    updateProfileTypeMutation.mutate({
      userId: user.id,
      profileType: "basic",
      badgeLevel: user.badgeLevel || 1
    });
  };

  const handleRemoveGStar = (user: User) => {
    updateProfileTypeMutation.mutate({
      userId: user.id,
      profileType: "basic",
      badgeLevel: user.badgeLevel || 1
    });
  };

  const handleResetToBasic = (user: User) => {
    updateProfileTypeMutation.mutate({
      userId: user.id,
      profileType: "basic",
      badgeLevel: 1
    });
  };

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      email: "",
      name: "",
      gender: "male",
      avatar: "",
      isBlocked: false,
      profileType: "basic",
      badgeLevel: 1,
      language: "en",
      dob: null,
      interests: [],
      aboutMe: "",
      isOnline: false,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userFormSchema>) => {
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("POST", `/api/users/${userId}/block`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User blocked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to block user",
        variant: "destructive",
      });
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("POST", `/api/users/${userId}/unblock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User unblocked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unblock user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof userFormSchema>) => {
    createUserMutation.mutate(data);
  };

  const handleBlockToggle = (user: User) => {
    if (user.isBlocked) {
      unblockUserMutation.mutate(user.id);
    } else {
      blockUserMutation.mutate(user.id);
    }
  };

  const handleViewUserDetails = (user: User) => {
    setSelectedUser(user);
    setIsUserDetailsOpen(true);
  };

  const handleCloseUserDetails = () => {
    setSelectedUser(null);
    setIsUserDetailsOpen(false);
  };

  return (
    <AdminLayout title="User Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-96"
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset profile type to basic if male is selected
                            if (value === "male" && form.getValues("profileType") !== "basic") {
                              form.setValue("profileType", "basic");
                            }
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="avatar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avatar URL</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                            placeholder="https://example.com/avatar.jpg" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="profileType"
                    render={({ field }) => {
                      const selectedGender = form.watch("gender");
                      const isMale = selectedGender === "male";
                      
                      return (
                        <FormItem>
                          <FormLabel>Profile Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="basic">Basic</SelectItem>
                              {!isMale && <SelectItem value="gicon">GIcon</SelectItem>}
                              {!isMale && <SelectItem value="gstar">GStar</SelectItem>}
                            </SelectContent>
                          </Select>
                          {isMale && (
                            <p className="text-sm text-gray-500 mt-1">
                              Only Basic profile type is available for male users
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  
                  <FormField
                    control={form.control}
                    name="badgeLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Badge Level (1-10)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="10" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="hi">Hindi</SelectItem>
                            <SelectItem value="bn">Bengali</SelectItem>
                            <SelectItem value="te">Telugu</SelectItem>
                            <SelectItem value="mr">Marathi</SelectItem>
                            <SelectItem value="ta">Tamil</SelectItem>
                            <SelectItem value="ur">Urdu</SelectItem>
                            <SelectItem value="gu">Gujarati</SelectItem>
                            <SelectItem value="kn">Kannada</SelectItem>
                            <SelectItem value="ml">Malayalam</SelectItem>
                            <SelectItem value="pa">Punjabi</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interests (comma-separated)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., gaming, music, travel, photography"
                            value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                            onChange={(e) => {
                              const interests = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                              field.onChange(interests);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="aboutMe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About Me</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us about yourself..."
                            className="min-h-[80px]"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 gradient-bg text-white" disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({users?.length || 0})</CardTitle>
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
                    <TableHead>Email</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Profile Type</TableHead>
                    <TableHead>Virtual Currency</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Profile Management</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user: User) => (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.avatar || undefined} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.gender === 'male' ? 'default' : 'secondary'}>
                          {user.gender}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={user.isBlocked ? 'destructive' : 'default'}>
                            {user.isBlocked ? 'Blocked' : 'Active'}
                          </Badge>
                          <div className="text-xs text-gray-500">
                            Lang: {user.language?.toUpperCase() || 'EN'}
                          </div>
                          {user.dob && (
                            <div className="text-xs text-gray-500">
                              Age: {Math.floor((new Date().getTime() - new Date(user.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}
                            </div>
                          )}
                          {user.interests && user.interests.length > 0 && (
                            <div className="text-xs text-gray-500">
                              Interests: {user.interests.slice(0, 2).join(', ')}{user.interests.length > 2 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.profileType === 'basic' ? 'outline' : 'default'}>
                            {user.profileType === 'basic' ? 'Basic' : 
                             user.profileType === 'gicon' ? 'GIcon' : 
                             user.profileType === 'gstar' ? 'GStar' : 
                             'GIcon + GStar'}
                          </Badge>
                          <span className="text-sm text-gray-500">Lv.{user.badgeLevel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleWalletClick(user)}
                          className="flex items-center gap-2 h-auto p-2"
                        >
                          <Wallet className="h-4 w-4 text-green-500" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-green-600">
                              ₹{getUserWalletBalance(user.id)}
                            </p>
                            <p className="text-xs text-gray-500">Click to manage</p>
                          </div>
                        </Button>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatRelativeTime(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.profileType === 'basic' && user.gender !== 'male' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePromoteToGIcon(user)}
                                disabled={updateProfileTypeMutation.isPending}
                                className="text-xs px-2 py-1"
                              >
                                <Star className="h-3 w-3 mr-1" />
                                GIcon
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePromoteToGStar(user)}
                                disabled={updateProfileTypeMutation.isPending}
                                className="text-xs px-2 py-1"
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                GStar
                              </Button>
                            </>
                          )}
                          {user.profileType === 'gicon' && user.gender !== 'male' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePromoteToGStar(user)}
                                disabled={updateProfileTypeMutation.isPending}
                                className="text-xs px-2 py-1"
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                +GStar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveGIcon(user)}
                                disabled={updateProfileTypeMutation.isPending}
                                className="text-xs px-2 py-1 text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Remove GIcon
                              </Button>
                            </>
                          )}
                          {user.profileType === 'gstar' && user.gender !== 'male' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveGStar(user)}
                                disabled={updateProfileTypeMutation.isPending}
                                className="text-xs px-2 py-1 text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Remove GStar
                              </Button>
                            </>
                          )}
                          {(user.profileType !== 'basic') && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpgradeBadgeLevel(user)}
                                disabled={updateProfileTypeMutation.isPending || (user.badgeLevel || 1) >= 10}
                                className="text-xs px-1 py-1 text-green-600"
                                title="Upgrade level"
                              >
                                +
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDowngradeBadgeLevel(user)}
                                disabled={updateProfileTypeMutation.isPending || (user.badgeLevel || 1) <= 1}
                                className="text-xs px-1 py-1 text-red-600"
                                title="Downgrade level"
                              >
                                -
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewUserDetails(user)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBlockToggle(user)}
                            disabled={blockUserMutation.isPending || unblockUserMutation.isPending}
                          >
                            {user.isBlocked ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-1" />
                                Unblock
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-1" />
                                Block
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {!isLoading && (!users || users.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UserDetailsModal
        user={selectedUser}
        isOpen={isUserDetailsOpen}
        onClose={handleCloseUserDetails}
        onBlockToggle={handleBlockToggle}
        isActionPending={blockUserMutation.isPending || unblockUserMutation.isPending}
      />
    </AdminLayout>
  );
}
