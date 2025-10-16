import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCoinPackageSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Package, Plus, Edit, Trash2, Coins, Eye } from "lucide-react";
import { CoinPackageGrid } from "@/components/ui/coin-package-preview";
import type { CoinPackage } from "@shared/schema";
import { z } from "zod";

// Create a custom form schema for the new price format
const coinPackageFormSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  coinAmount: z.number().min(1, "Coin amount must be at least 1"),
  originalPrice: z.string().min(1, "Original price is required"),
  offerPrice: z.string().min(1, "Offer price is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export default function CoinPackages() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CoinPackageResponse | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'preview'>('table');
  const { toast } = useToast();

  // Define extended type for API response that includes both old and new formats
  type CoinPackageResponse = {
    id: string | number;
    name: string;
    coinAmount: number;
    price: string;
    originalPrice?: string;
    offerPrice?: string;
    discount?: number;
    description?: string;
    isActive: boolean;
    createdAt?: Date;
  };

  const { data: packages = [], isLoading } = useQuery<CoinPackageResponse[]>({
    queryKey: ["/api/coin-packages"],
  });

  const form = useForm<z.infer<typeof coinPackageFormSchema>>({
    resolver: zodResolver(coinPackageFormSchema),
    defaultValues: {
      name: "",
      coinAmount: 0,
      originalPrice: "0.00",
      offerPrice: "0.00",
      description: "",
      isActive: true,
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof coinPackageFormSchema>) => {
      // Transform the form data to the backend format
      const transformedData = {
        name: data.name,
        coinAmount: data.coinAmount,
        price: data.originalPrice,
        discount: Math.round((1 - parseFloat(data.offerPrice) / parseFloat(data.originalPrice)) * 100),
        description: data.description,
        isActive: data.isActive,
      };
      return apiRequest("POST", "/api/coin-packages", transformedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coin-packages"] });
      setIsDialogOpen(false);
      setEditingPackage(null);
      form.reset();
      toast({
        title: "Success",
        description: "Coin package created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create coin package",
        variant: "destructive",
      });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: z.infer<typeof coinPackageFormSchema> }) => {
      // Transform the form data to the backend format
      const transformedData = {
        name: data.name,
        coinAmount: data.coinAmount,
        price: data.originalPrice,
        discount: Math.round((1 - parseFloat(data.offerPrice) / parseFloat(data.originalPrice)) * 100),
        description: data.description,
        isActive: data.isActive,
      };
      return apiRequest("PATCH", `/api/coin-packages/${id}`, transformedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coin-packages"] });
      setIsDialogOpen(false);
      setEditingPackage(null);
      form.reset();
      toast({
        title: "Success",
        description: "Coin package updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coin package",
        variant: "destructive",
      });
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (id: string | number) => {
      return apiRequest("DELETE", `/api/coin-packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coin-packages"] });
      toast({
        title: "Success",
        description: "Coin package deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete coin package",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof coinPackageFormSchema>) => {
    if (editingPackage) {
      updatePackageMutation.mutate({ id: editingPackage.id, data });
    } else {
      createPackageMutation.mutate(data);
    }
  };

  const handleEdit = (pkg: any) => {
    setEditingPackage(pkg);
    // Extract originalPrice and offerPrice from the API response
    const originalPrice = pkg.originalPrice ? pkg.originalPrice.replace('₹', '') : pkg.price;
    const offerPrice = pkg.offerPrice ? pkg.offerPrice.replace('₹', '') : pkg.price;
    
    form.reset({
      name: pkg.name,
      coinAmount: pkg.coinAmount,
      originalPrice: originalPrice,
      offerPrice: offerPrice,
      description: pkg.description || "",
      isActive: pkg.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (pkg: CoinPackageResponse) => {
    if (window.confirm("Are you sure you want to delete this coin package?")) {
      // Use the full ID as-is (works with both MongoDB ObjectIds and numeric IDs)
      deletePackageMutation.mutate(pkg.id);
    }
  };

  const totalPackages = packages.length;
  const activePackages = packages.filter((p: CoinPackageResponse) => p.isActive).length;
  const totalRevenue = packages.reduce((sum: number, p: any) => {
    if (!p.isActive) return sum;
    const price = p.offerPrice ? parseFloat(p.offerPrice.replace('₹', '')) : parseFloat(p.price || '0');
    return sum + price;
  }, 0);

  return (
    <AdminLayout title="Coin Package Management">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Packages</p>
                  <p className="text-3xl font-bold text-gray-900">{totalPackages}</p>
                </div>
                <div className="gradient-bg p-3 rounded-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Active Packages</p>
                  <p className="text-3xl font-bold text-green-600">{activePackages}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <Coins className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Potential Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <Package className="h-4 w-4 mr-2" />
              Table View
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('preview')}
            >
              <Eye className="h-4 w-4 mr-2" />
              3D Preview
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg text-white" onClick={() => setEditingPackage(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Package
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingPackage ? "Edit Coin Package" : "Add New Coin Package"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Package Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Starter Pack" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="coinAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coin Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="originalPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Original Price (INR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            placeholder="50.00"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-gray-500">
                          Enter the original price in Indian Rupees
                        </p>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="offerPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offer Price (INR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            placeholder="40.00"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-gray-500">
                          Enter the final offer price in Indian Rupees
                        </p>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Package description..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Package</FormLabel>
                          <p className="text-sm text-gray-500">
                            Make this package available for purchase
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1 gradient-bg text-white" 
                      disabled={createPackageMutation.isPending || updatePackageMutation.isPending}
                    >
                      {(createPackageMutation.isPending || updatePackageMutation.isPending) ? 
                        "Saving..." : 
                        editingPackage ? "Update Package" : "Create Package"
                      }
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

        {/* Packages Display */}
        {viewMode === 'preview' ? (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Interactive Coin Package Preview</h3>
              <p className="text-gray-600">Hover over packages to see 3D spinning coin animations</p>
            </div>
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <CoinPackageGrid 
                packages={packages as any} 
                onPackageSelect={(pkg) => handleEdit(pkg)}
                className="mt-8"
              />
            )}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Coin Packages ({totalPackages})</CardTitle>
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
                    <TableHead>Package Name</TableHead>
                    <TableHead>Coins</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Offer Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg: CoinPackageResponse) => (
                    <TableRow key={pkg.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium">{pkg.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Coins className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="font-semibold">{pkg.coinAmount.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {pkg.originalPrice && pkg.offerPrice ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-green-600">
                                  {pkg.offerPrice}
                                </span>
                                {pkg.originalPrice !== pkg.offerPrice && (
                                  <Badge variant="destructive" className="text-xs">
                                    OFFER
                                  </Badge>
                                )}
                              </div>
                              {pkg.originalPrice !== pkg.offerPrice && (
                                <div className="text-sm text-gray-500 line-through">
                                  {pkg.originalPrice}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="font-semibold text-gray-900">
                              {pkg.price ? formatCurrency(pkg.price) : '-'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-gray-500 truncate">
                          {pkg.description || "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pkg.isActive ? "default" : "secondary"}>
                          {pkg.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {pkg.createdAt ? formatDate(pkg.createdAt) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(pkg)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(pkg)}
                            disabled={deletePackageMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
              
              {!isLoading && (!packages || packages.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No coin packages found
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
