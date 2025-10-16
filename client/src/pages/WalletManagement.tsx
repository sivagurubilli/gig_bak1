import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWalletTransactionSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Search, Plus, Minus, CreditCard } from "lucide-react";
import type { WalletTransaction, User } from "@shared/schema";
import { z } from "zod";

const walletTransactionFormSchema = insertWalletTransactionSchema.extend({
  userId: z.string().min(1, "Please select a user"),
});

export default function WalletManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: transactions, isLoading } = useQuery<WalletTransaction[]>({
    queryKey: ["/api/wallet/transactions"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<z.infer<typeof walletTransactionFormSchema>>({
    resolver: zodResolver(walletTransactionFormSchema),
    defaultValues: {
      userId: "",
      type: "credit",
      amount: 0,
      description: "",
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof walletTransactionFormSchema>) => {
      return apiRequest("POST", "/api/wallet/transactions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Transaction created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof walletTransactionFormSchema>) => {
    createTransactionMutation.mutate(data);
  };

  const filteredTransactions = (transactions || []).filter((transaction: WalletTransaction) => {
    if (!searchQuery) return true;
    const user = (users || []).find((u: User) => u.id === transaction.userId);
    return user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
           transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getUserName = (userId: any) => {
    // If userId is already a populated user object
    if (typeof userId === 'object' && userId && userId.name) {
      return `${userId.name} (@${userId.username})`;
    }
    
    // If userId is a string/number, find the user in the users array
    const user = (users || []).find((u: User) => u.id === userId);
    return user ? `${user.name} (@${user.username})` : `User ${userId}`;
  };

  return (
    <AdminLayout title="Wallet & Coin Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-96"
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg text-white">
                <CreditCard className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Wallet Transaction</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(users || []).map((user: User) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name} (@{user.username})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="credit">Credit (Add Coins)</SelectItem>
                            <SelectItem value="debit">Debit (Remove Coins)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (Coins)</FormLabel>
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Reason for transaction" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 gradient-bg text-white" disabled={createTransactionMutation.isPending}>
                      {createTransactionMutation.isPending ? "Processing..." : "Create Transaction"}
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

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet Transactions ({filteredTransactions.length})</CardTitle>
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
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction: WalletTransaction) => (
                    <TableRow key={transaction.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium">
                          {getUserName(transaction.userId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {transaction.type === 'credit' ? (
                            <div className="flex items-center text-green-600">
                              <Plus className="h-4 w-4 mr-1" />
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Credit
                              </Badge>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600">
                              <Minus className="h-4 w-4 mr-1" />
                              <Badge variant="destructive">
                                Debit
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}{transaction.amount.toLocaleString()} coins
                        </span>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(transaction.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {!isLoading && filteredTransactions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No transactions found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
