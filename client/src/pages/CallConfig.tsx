import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Phone, Video, MessageCircle, Percent, Save, Settings, Star, Crown, Coins } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AdminLayout } from "@/components/layout/AdminLayout";

interface CallConfig {
  videoCallCoinsPerMin: number;
  audioCallCoinsPerMin: number;
  gStarAudioCoinsPerMin: number;
  gStarVideoCoinsPerMin: number;
  messageCoins: number;
  adminCommissionPercent: number;
  gstarAdminCommission: number;
  giconAdminCommission: number;
  coinToRupeeRatio: number;
}

export default function CallConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch current configuration
  const { data: serverConfig, isLoading, refetch } = useQuery({
    queryKey: ['/api/call-config'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/call-config');
      return await response.json();
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data
  });

  // Local form state - initialize with defaults
  const [formConfig, setFormConfig] = useState<CallConfig>({
    videoCallCoinsPerMin: 10,
    audioCallCoinsPerMin: 5,
    gStarAudioCoinsPerMin: 8,
    gStarVideoCoinsPerMin: 15,
    messageCoins: 1,
    adminCommissionPercent: 20,
    gstarAdminCommission: 15,
    giconAdminCommission: 10,
    coinToRupeeRatio: 10
  });

  // Update form state when server data changes
  useEffect(() => {
    console.log('Server config received:', serverConfig);
    if (serverConfig && typeof serverConfig === 'object') {
      const config = serverConfig as CallConfig;
      console.log('Updating form config with:', config);
      setFormConfig({
        videoCallCoinsPerMin: config.videoCallCoinsPerMin || 10,
        audioCallCoinsPerMin: config.audioCallCoinsPerMin || 5,
        gStarAudioCoinsPerMin: config.gStarAudioCoinsPerMin || 8,
        gStarVideoCoinsPerMin: config.gStarVideoCoinsPerMin || 15,
        messageCoins: config.messageCoins || 1,
        adminCommissionPercent: config.adminCommissionPercent || 20,
        gstarAdminCommission: config.gstarAdminCommission || 15,
        giconAdminCommission: config.giconAdminCommission || 10,
        coinToRupeeRatio: config.coinToRupeeRatio || 10
      });
    }
  }, [serverConfig]);

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: CallConfig) => {
      const response = await apiRequest('PUT', '/api/call-config', newConfig);
      return await response.json();
    },
    onSuccess: async (data) => {
      console.log('Save successful, received data:', data);
      toast({
        title: "Configuration Updated",
        description: "Call configuration has been updated successfully.",
      });
      
      // Clear cache and force fresh fetch
      queryClient.removeQueries({ queryKey: ['/api/call-config'] });
      
      // Force refetch from server to get the latest data
      const freshData = await refetch();
      console.log('Fresh data after refetch:', freshData.data);
    },
    onError: (error: any) => {
      console.error('Save failed:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof CallConfig, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormConfig(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleSave = () => {
    // Validation
    if (formConfig.videoCallCoinsPerMin < 0 || formConfig.audioCallCoinsPerMin < 0 || 
        formConfig.gStarAudioCoinsPerMin < 0 || formConfig.gStarVideoCoinsPerMin < 0 ||
        formConfig.messageCoins < 0 || formConfig.adminCommissionPercent < 0 || 
        formConfig.adminCommissionPercent > 100 || formConfig.gstarAdminCommission < 0 || 
        formConfig.gstarAdminCommission > 100 || formConfig.giconAdminCommission < 0 || 
        formConfig.giconAdminCommission > 100 || formConfig.coinToRupeeRatio < 1 ||
        formConfig.coinToRupeeRatio > 1000) {
      toast({
        title: "Invalid Values",
        description: "Please enter valid values. Commissions: 0-100%, Coin ratio: 1-1000.",
        variant: "destructive",
      });
      return;
    }

    updateConfigMutation.mutate(formConfig);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Call Configuration">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Call Configuration">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Call Configuration</h1>
            <p className="text-gray-600 mt-2">
              Configure pricing for video calls, audio calls, messages, and admin commissions
            </p>
          </div>
          <Settings className="h-8 w-8 text-primary" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Video Call Configuration */}
          <Card className="card-hover">
            <CardHeader className="gradient-card-bg">
              <CardTitle className="flex items-center">
                <Video className="mr-2 h-5 w-5" />
                GIcon Video Call Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="videoCoins">Coins per Minute</Label>
                <Input
                  id="videoCoins"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formConfig.videoCallCoinsPerMin.toString()}
                  onChange={(e) => handleInputChange('videoCallCoinsPerMin', e.target.value)}
                  placeholder="Enter coins per minute"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Amount charged per minute for video calls
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Audio Call Configuration */}
          <Card className="card-hover">
            <CardHeader className="gradient-card-bg">
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5" />
                GIcon Audio Call Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="audioCoins">Coins per Minute</Label>
                <Input
                  id="audioCoins"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formConfig.audioCallCoinsPerMin.toString()}
                  onChange={(e) => handleInputChange('audioCallCoinsPerMin', e.target.value)}
                  placeholder="Enter coins per minute"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Amount charged per minute for audio calls
                </p>
              </div>
            </CardContent>
          </Card>

          {/* GStar Audio Call Configuration */}
          <Card className="card-hover">
            <CardHeader className="gradient-card-bg">
              <CardTitle className="flex items-center">
                <Star className="mr-2 h-5 w-5" />
                GStar Audio Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="gStarAudioCoins">Coins per Minute</Label>
                <Input
                  id="gStarAudioCoins"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formConfig.gStarAudioCoinsPerMin.toString()}
                  onChange={(e) => handleInputChange('gStarAudioCoinsPerMin', e.target.value)}
                  placeholder="Enter coins per minute"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Amount charged per minute for GStar audio calls
                </p>
              </div>
            </CardContent>
          </Card>

          {/* GStar Video Call Configuration */}
          <Card className="card-hover">
            <CardHeader className="gradient-card-bg">
              <CardTitle className="flex items-center">
                <Star className="mr-2 h-5 w-5" />
                GStar Video Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="gStarVideoCoins">Coins per Minute</Label>
                <Input
                  id="gStarVideoCoins"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formConfig.gStarVideoCoinsPerMin.toString()}
                  onChange={(e) => handleInputChange('gStarVideoCoinsPerMin', e.target.value)}
                  placeholder="Enter coins per minute"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Amount charged per minute for GStar video calls
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Message Configuration */}
          <Card className="card-hover">
            <CardHeader className="gradient-card-bg">
              <CardTitle className="flex items-center">
                <MessageCircle className="mr-2 h-5 w-5" />
                Message Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="messageCoins">Coins per Message</Label>
                <Input
                  id="messageCoins"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formConfig.messageCoins.toString()}
                  onChange={(e) => handleInputChange('messageCoins', e.target.value)}
                  placeholder="Enter coins per message"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Amount charged per message sent
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Coin Conversion Configuration */}
          <Card className="card-hover">
            <CardHeader className="gradient-card-bg">
              <CardTitle className="flex items-center">
                <Coins className="mr-2 h-5 w-5" />
                Coin Conversion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="coinRatio">Coins per Rupee</Label>
                <Input
                  id="coinRatio"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  value={formConfig.coinToRupeeRatio.toString()}
                  onChange={(e) => handleInputChange('coinToRupeeRatio', e.target.value)}
                  placeholder="Enter coins per rupee"
                />
                <p className="text-sm text-gray-500 mt-1">
                  How many coins equal ₹1 for withdrawals
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Current: {formConfig.coinToRupeeRatio} coins = ₹1
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Admin Commission Configuration */}
          <Card className="card-hover">
            <CardHeader className="gradient-card-bg">
              <CardTitle className="flex items-center">
                <Percent className="mr-2 h-5 w-5" />
                Admin Commission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="commission">Commission Percentage</Label>
                <Input
                  id="commission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formConfig.adminCommissionPercent.toString()}
                  onChange={(e) => handleInputChange('adminCommissionPercent', e.target.value)}
                  placeholder="Enter commission percentage"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Platform commission on all transactions (0-100%)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Gstar Admin Commission Configuration */}
          <Card className="card-hover">
            <CardHeader className="gradient-card-bg">
              <CardTitle className="flex items-center">
                <Star className="mr-2 h-5 w-5" />
                Gstar Admin Commission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="gstarCommission">Gstar Commission Percentage</Label>
                <Input
                  id="gstarCommission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formConfig.gstarAdminCommission.toString()}
                  onChange={(e) => handleInputChange('gstarAdminCommission', e.target.value)}
                  placeholder="Enter Gstar commission percentage"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Gstar platform commission on transactions (0-100%)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Gicon Admin Commission Configuration */}
          <Card className="card-hover">
            <CardHeader className="gradient-card-bg">
              <CardTitle className="flex items-center">
                <Crown className="mr-2 h-5 w-5" />
                Gicon Admin Commission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="giconCommission">Gicon Commission Percentage</Label>
                <Input
                  id="giconCommission"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formConfig.giconAdminCommission.toString()}
                  onChange={(e) => handleInputChange('giconAdminCommission', e.target.value)}
                  placeholder="Enter Gicon commission percentage"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Gicon platform commission on transactions (0-100%)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Configuration Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Video className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{formConfig.videoCallCoinsPerMin}</div>
                <div className="text-sm text-gray-600">Video Coins/Min</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Phone className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">{formConfig.audioCallCoinsPerMin}</div>
                <div className="text-sm text-gray-600">Audio Coins/Min</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold">{formConfig.gStarAudioCoinsPerMin}</div>
                <div className="text-sm text-gray-600">GStar Audio/Min</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Star className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <div className="text-2xl font-bold">{formConfig.gStarVideoCoinsPerMin}</div>
                <div className="text-sm text-gray-600">GStar Video/Min</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <div className="text-2xl font-bold">{formConfig.messageCoins}</div>
                <div className="text-sm text-gray-600">Message Coins</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Percent className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold">{formConfig.adminCommissionPercent}%</div>
                <div className="text-sm text-gray-600">Admin Commission</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold">{formConfig.gstarAdminCommission}%</div>
                <div className="text-sm text-gray-600">Gstar Commission</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Crown className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
                <div className="text-2xl font-bold">{formConfig.giconAdminCommission}%</div>
                <div className="text-sm text-gray-600">Gicon Commission</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Coins className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                <div className="text-2xl font-bold">{formConfig.coinToRupeeRatio}:1</div>
                <div className="text-sm text-gray-600">Coin Conversion</div>
                <div className="text-xs text-emerald-600">{formConfig.coinToRupeeRatio} coins = ₹1</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={updateConfigMutation.isPending}
            className="px-8"
          >
            {updateConfigMutation.isPending ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Configuration
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}