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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBonusRuleSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Star, Plus, Edit, Trash2, Search, Gift, Clock, DollarSign } from "lucide-react";
import type { BonusRule } from "@shared/schema";
import { z } from "zod";

const bonusRuleFormSchema = insertBonusRuleSchema.extend({
  conditions: z.string().min(1, "Conditions are required"),
});

export default function BonusManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BonusRule | null>(null);
  const { toast } = useToast();

  const { data: bonusRules, isLoading } = useQuery({
    queryKey: ["/api/bonus-rules"],
  });

  const form = useForm<z.infer<typeof bonusRuleFormSchema>>({
    resolver: zodResolver(bonusRuleFormSchema),
    defaultValues: {
      name: "",
      type: "daily_login",
      coinReward: 0,
      conditions: "",
      isActive: true,
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bonusRuleFormSchema>) => {
      const ruleData = {
        ...data,
        conditions: JSON.parse(data.conditions),
      };
      return apiRequest("POST", "/api/bonus-rules", ruleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bonus-rules"] });
      setIsDialogOpen(false);
      setEditingRule(null);
      form.reset();
      toast({
        title: "Success",
        description: "Bonus rule created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bonus rule",
        variant: "destructive",
      });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BonusRule> }) => {
      return apiRequest("PATCH", `/api/bonus-rules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bonus-rules"] });
      setIsDialogOpen(false);
      setEditingRule(null);
      form.reset();
      toast({
        title: "Success",
        description: "Bonus rule updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bonus rule",
        variant: "destructive",
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/bonus-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bonus-rules"] });
      toast({
        title: "Success",
        description: "Bonus rule deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bonus rule",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof bonusRuleFormSchema>) => {
    try {
      // Validate JSON format
      JSON.parse(data.conditions);
      
      if (editingRule) {
        const updateData = {
          ...data,
          conditions: JSON.parse(data.conditions),
        };
        updateRuleMutation.mutate({ id: editingRule.id, data: updateData });
      } else {
        createRuleMutation.mutate(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid JSON format in conditions",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (rule: BonusRule) => {
    setEditingRule(rule);
    form.reset({
      name: rule.name,
      type: rule.type,
      coinReward: rule.coinReward,
      conditions: JSON.stringify(rule.conditions, null, 2),
      isActive: rule.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this bonus rule?")) {
      deleteRuleMutation.mutate(id);
    }
  };

  const handleToggleActive = (rule: BonusRule) => {
    updateRuleMutation.mutate({
      id: rule.id,
      data: { isActive: !rule.isActive },
    });
  };

  const filteredRules = bonusRules?.filter((rule: BonusRule) => {
    if (!searchQuery) return true;
    return rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           rule.type.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily_login':
        return <Clock className="h-4 w-4" />;
      case 'online_time':
        return <Clock className="h-4 w-4" />;
      case 'first_purchase':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Gift className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'daily_login':
        return <Badge className="bg-blue-100 text-blue-800">Daily Login</Badge>;
      case 'online_time':
        return <Badge className="bg-green-100 text-green-800">Online Time</Badge>;
      case 'first_purchase':
        return <Badge className="bg-purple-100 text-purple-800">First Purchase</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getConditionsTemplate = (type: string) => {
    switch (type) {
      case 'daily_login':
        return JSON.stringify({ consecutiveDays: 1 }, null, 2);
      case 'online_time':
        return JSON.stringify({ minimumMinutes: 30 }, null, 2);
      case 'first_purchase':
        return JSON.stringify({ minimumAmount: 1 }, null, 2);
      default:
        return JSON.stringify({}, null, 2);
    }
  };

  const totalRules = bonusRules?.length || 0;
  const activeRules = bonusRules?.filter((r: BonusRule) => r.isActive).length || 0;
  const totalReward = bonusRules?.reduce((sum: number, r: BonusRule) => sum + (r.isActive ? r.coinReward : 0), 0) || 0;

  return (
    <AdminLayout title="Bonus Management">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Rules</p>
                  <p className="text-3xl font-bold text-gray-900">{totalRules}</p>
                </div>
                <div className="gradient-bg p-3 rounded-lg">
                  <Star className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Active Rules</p>
                  <p className="text-3xl font-bold text-green-600">{activeRules}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <Star className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Reward Pool</p>
                  <p className="text-3xl font-bold text-gray-900">{totalReward.toLocaleString()} coins</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Gift className="h-6 w-6 text-blue-600" />
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
              placeholder="Search bonus rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-96"
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg text-white" onClick={() => setEditingRule(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bonus Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? "Edit Bonus Rule" : "Add New Bonus Rule"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rule Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Daily Login Bonus" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rule Type</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("conditions", getConditionsTemplate(value));
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily_login">Daily Login</SelectItem>
                            <SelectItem value="online_time">Online Time</SelectItem>
                            <SelectItem value="first_purchase">First Purchase</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="coinReward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coin Reward</FormLabel>
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
                    name="conditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conditions (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder='{"minimumDays": 1}'
                            rows={6}
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          Enter conditions as JSON. Examples: daily_login: {`{"consecutiveDays": 1}`}, 
                          online_time: {`{"minimumMinutes": 30}`}
                        </p>
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
                          <FormLabel className="text-base">Active Rule</FormLabel>
                          <p className="text-sm text-gray-500">
                            Enable this bonus rule for users
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
                      disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                    >
                      {(createRuleMutation.isPending || updateRuleMutation.isPending) ? 
                        "Saving..." : 
                        editingRule ? "Update Rule" : "Create Rule"
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

        {/* Bonus Rules Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bonus Rules ({filteredRules.length})</CardTitle>
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
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Coin Reward</TableHead>
                    <TableHead>Conditions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule: BonusRule) => (
                    <TableRow key={rule.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(rule.type)}
                          <span className="font-medium">{rule.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(rule.type)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="font-semibold">{rule.coinReward}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {JSON.stringify(rule.conditions)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={() => handleToggleActive(rule)}
                            disabled={updateRuleMutation.isPending}
                          />
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(rule.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(rule.id)}
                            disabled={deleteRuleMutation.isPending}
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
            
            {!isLoading && filteredRules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No bonus rules found</p>
                <p className="text-sm">Create your first bonus rule to reward users</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rule Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Common Rule Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => {
                form.setValue("name", "Daily Login Bonus");
                form.setValue("type", "daily_login");
                form.setValue("coinReward", 10);
                form.setValue("conditions", getConditionsTemplate("daily_login"));
                form.setValue("isActive", true);
                setIsDialogOpen(true);
              }}>
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Daily Login</h4>
                    <p className="text-sm text-gray-500">Reward daily logins</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => {
                form.setValue("name", "Online Time Bonus");
                form.setValue("type", "online_time");
                form.setValue("coinReward", 25);
                form.setValue("conditions", getConditionsTemplate("online_time"));
                form.setValue("isActive", true);
                setIsDialogOpen(true);
              }}>
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Online Time</h4>
                    <p className="text-sm text-gray-500">Reward active users</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => {
                form.setValue("name", "First Purchase Bonus");
                form.setValue("type", "first_purchase");
                form.setValue("coinReward", 50);
                form.setValue("conditions", getConditionsTemplate("first_purchase"));
                form.setValue("isActive", true);
                setIsDialogOpen(true);
              }}>
                <div className="flex items-center space-x-3">
                  <div className="gradient-bg p-2 rounded-lg">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium">First Purchase</h4>
                    <p className="text-sm text-gray-500">Welcome new customers</p>
                  </div>
                </div>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
