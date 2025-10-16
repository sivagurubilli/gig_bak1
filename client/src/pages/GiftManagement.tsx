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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGiftSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Gift, Plus, Edit, Trash2, Coins, Search } from "lucide-react";
import type { Gift as GiftType } from "@shared/schema";
import { z } from "zod";

const giftFormSchema = insertGiftSchema;

export default function GiftManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGift, setEditingGift] = useState<GiftType | null>(null);
  const { toast } = useToast();

  const { data: gifts, isLoading } = useQuery({
    queryKey: ["/api/gifts"],
  });

  const form = useForm<z.infer<typeof giftFormSchema>>({
    resolver: zodResolver(giftFormSchema),
    defaultValues: {
      name: "",
      image: "",
      coinValue: 0,
      isActive: true,
    },
  });

  const createGiftMutation = useMutation({
    mutationFn: async (data: z.infer<typeof giftFormSchema>) => {
      return apiRequest("POST", "/api/gifts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gifts"] });
      setIsDialogOpen(false);
      setEditingGift(null);
      form.reset();
      toast({
        title: "Success",
        description: "Gift created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create gift",
        variant: "destructive",
      });
    },
  });

  const updateGiftMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<GiftType> }) => {
      return apiRequest("PATCH", `/api/gifts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gifts"] });
      setIsDialogOpen(false);
      setEditingGift(null);
      form.reset();
      toast({
        title: "Success",
        description: "Gift updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update gift",
        variant: "destructive",
      });
    },
  });

  const deleteGiftMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/gifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gifts"] });
      toast({
        title: "Success",
        description: "Gift deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete gift",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof giftFormSchema>) => {
    if (editingGift) {
      updateGiftMutation.mutate({ id: editingGift.id, data });
    } else {
      createGiftMutation.mutate(data);
    }
  };

  const handleEdit = (gift: GiftType) => {
    setEditingGift(gift);
    form.reset({
      name: gift.name,
      image: gift.image,
      coinValue: gift.coinValue,
      isActive: gift.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this gift?")) {
      deleteGiftMutation.mutate(id);
    }
  };

  const filteredGifts = gifts?.filter((gift: GiftType) => {
    if (!searchQuery) return true;
    return gift.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           gift.coinValue.toString().includes(searchQuery);
  }) || [];

  const totalGifts = gifts?.length || 0;
  const activeGifts = gifts?.filter((g: GiftType) => g.isActive).length || 0;
  const totalValue = gifts?.reduce((sum: number, g: GiftType) => sum + (g.isActive ? g.coinValue : 0), 0) || 0;

  return (
    <AdminLayout title="Gift Management">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Gifts</p>
                  <p className="text-3xl font-bold text-gray-900">{totalGifts}</p>
                </div>
                <div className="gradient-bg p-3 rounded-lg">
                  <Gift className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Active Gifts</p>
                  <p className="text-3xl font-bold text-green-600">{activeGifts}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <Gift className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Value</p>
                  <p className="text-3xl font-bold text-gray-900">{totalValue.toLocaleString()} coins</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Coins className="h-6 w-6 text-blue-600" />
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
              placeholder="Search gifts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-96"
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg text-white" onClick={() => setEditingGift(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Gift
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingGift ? "Edit Gift" : "Add New Gift"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gift Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Rose, Diamond, Heart" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com/gift-image.png" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="coinValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coin Value</FormLabel>
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
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Gift</FormLabel>
                          <p className="text-sm text-gray-500">
                            Make this gift available for sending
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
                      disabled={createGiftMutation.isPending || updateGiftMutation.isPending}
                    >
                      {(createGiftMutation.isPending || updateGiftMutation.isPending) ? 
                        "Saving..." : 
                        editingGift ? "Update Gift" : "Create Gift"
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

        {/* Gifts Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Gifts ({filteredGifts.length})</CardTitle>
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
                    <TableHead>Gift</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Coin Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGifts.map((gift: GiftType) => (
                    <TableRow key={gift.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium">{gift.name}</div>
                      </TableCell>
                      <TableCell>
                        <img
                          src={gift.image}
                          alt={gift.name}
                          className="w-12 h-12 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzNkMyNiAzNiAyOCAzNCAyOCAzMkMyOCAzMCAyNiAyOCAyNCAyOEMyMiAyOCAyMCAzMCAyMCAzMkMyMCAzNCAyMiAzNiAyNCAzNloiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+';
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Coins className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="font-semibold">{gift.coinValue}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={gift.isActive ? "default" : "secondary"}>
                          {gift.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(gift.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(gift)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(gift.id)}
                            disabled={deleteGiftMutation.isPending}
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
            
            {!isLoading && filteredGifts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No gifts found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
