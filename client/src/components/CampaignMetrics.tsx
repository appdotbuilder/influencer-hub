import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Target, 
  Plus, 
  RefreshCw,
  Calendar as CalendarIcon,
  TrendingUp,
  DollarSign,
  Users,
  Eye,
  Heart,
  MessageSquare,
  Share,
  BarChart3,
  Instagram,
  MessageCircle,
  Video,
  Facebook,
  Crown,
  Play,
  Pause,
  CheckCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { trpc } from '@/utils/trpc';
import type { 
  Campaign, 
  CampaignMetric,
  CreateCampaignInput,
  CreateCampaignMetricInput,
  CampaignStatus,
  SocialPlatform 
} from '../../../server/src/schema';

interface CampaignMetricsProps {
  userId: number;
}

const statusIcons = {
  planning: Clock,
  active: Play,
  completed: CheckCircle,
  paused: Pause
};

const statusColors = {
  planning: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  paused: 'bg-gray-100 text-gray-800'
};

const platformIcons = {
  tiktok: Video,
  instagram: Instagram,
  x: MessageCircle,
  facebook: Facebook,
  onlyfans: Crown
};

const metricIcons: Record<string, any> = {
  views: Eye,
  likes: Heart,
  comments: MessageSquare,
  shares: Share,
  followers: Users,
  engagement_rate: TrendingUp,
  reach: Users,
  impressions: Eye,
  clicks: Target,
  conversions: Target,
  revenue: DollarSign
};

export function CampaignMetrics({ userId }: CampaignMetricsProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetric[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Create campaign form
  const [newCampaign, setNewCampaign] = useState<CreateCampaignInput>({
    user_id: userId,
    name: '',
    description: null,
    start_date: new Date(),
    end_date: null,
    budget: null,
    target_platforms: [],
    goals: null
  });

  // Create metric form
  const [newMetric, setNewMetric] = useState<CreateCampaignMetricInput>({
    campaign_id: 0,
    platform: 'instagram',
    metric_name: '',
    metric_value: 0
  });

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const loadCampaigns = useCallback(async () => {
    try {
      const campaignsData = await trpc.getCampaignsByUser.query({ userId });
      setCampaigns(campaignsData);
      
      if (selectedCampaign) {
        // Reload metrics for selected campaign
        const metricsData = await trpc.getCampaignMetrics.query({ 
          campaignId: selectedCampaign.id 
        });
        setCampaignMetrics(metricsData);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  }, [userId, selectedCampaign]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const loadCampaignMetrics = useCallback(async (campaignId: number) => {
    try {
      const metricsData = await trpc.getCampaignMetrics.query({ campaignId });
      setCampaignMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load campaign metrics:', error);
    }
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const created = await trpc.createCampaign.mutate(newCampaign);
      setCampaigns(prev => [created, ...prev]);
      setNewCampaign({
        user_id: userId,
        name: '',
        description: null,
        start_date: new Date(),
        end_date: null,
        budget: null,
        target_platforms: [],
        goals: null
      });
      setStartDate(undefined);
      setEndDate(undefined);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create campaign:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await trpc.createCampaignMetric.mutate({
        ...newMetric,
        campaign_id: selectedCampaign!.id
      });
      setCampaignMetrics(prev => [created, ...prev]);
      setNewMetric({
        campaign_id: 0,
        platform: 'instagram',
        metric_name: '',
        metric_value: 0
      });
      setShowMetricForm(false);
    } catch (error) {
      console.error('Failed to create metric:', error);
    }
  };

  const togglePlatform = (platform: SocialPlatform) => {
    setNewCampaign(prev => ({
      ...prev,
      target_platforms: prev.target_platforms.includes(platform)
        ? prev.target_platforms.filter(p => p !== platform)
        : [...prev.target_platforms, platform]
    }));
  };

  const getMetricsByPlatform = () => {
    const platformMetrics: Record<string, CampaignMetric[]> = {};
    
    campaignMetrics.forEach(metric => {
      if (!platformMetrics[metric.platform]) {
        platformMetrics[metric.platform] = [];
      }
      platformMetrics[metric.platform].push(metric);
    });
    
    return platformMetrics;
  };

  const getTotalMetrics = () => {
    const totals: Record<string, number> = {};
    
    campaignMetrics.forEach(metric => {
      if (!totals[metric.metric_name]) {
        totals[metric.metric_name] = 0;
      }
      totals[metric.metric_name] += metric.metric_value;
    });
    
    return totals;
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Campaign Analytics</h2>
          <p className="text-gray-600 mt-2">Track performance and ROI across all your campaigns 📊</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)} 
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
          <Button onClick={loadCampaigns} variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Campaigns</p>
                <p className="text-3xl font-bold">{campaigns.length}</p>
              </div>
              <Target className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Active Campaigns</p>
                <p className="text-3xl font-bold">{activeCampaigns}</p>
              </div>
              <Play className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Budget</p>
                <p className="text-3xl font-bold">${totalBudget.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Campaign Form */}
      {showCreateForm && (
        <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Target className="h-5 w-5" />
              Create New Campaign
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCampaign} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                  <Input
                    placeholder="Summer Product Launch"
                    value={newCampaign.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewCampaign(prev => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget (Optional)</label>
                  <Input
                    type="number"
                    placeholder="5000"
                    min="0"
                    step="0.01"
                    value={newCampaign.budget || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewCampaign(prev => ({ ...prev, budget: e.target.value ? parseFloat(e.target.value) : null }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Textarea
                  placeholder="Describe your campaign objectives and strategy..."
                  value={newCampaign.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewCampaign(prev => ({ ...prev, description: e.target.value || null }))
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : format(newCampaign.start_date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate || newCampaign.start_date}
                        onSelect={(date) => {
                          setStartDate(date);
                          if (date) {
                            setNewCampaign(prev => ({ ...prev, start_date: date }));
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : 'Select end date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date);
                          setNewCampaign(prev => ({ ...prev, end_date: date }));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {(['tiktok', 'instagram', 'x', 'facebook', 'onlyfans'] as SocialPlatform[]).map(platform => {
                    const PlatformIcon = platformIcons[platform];
                    const isSelected = newCampaign.target_platforms.includes(platform);
                    
                    return (
                      <Button
                        key={platform}
                        type="button"
                        onClick={() => togglePlatform(platform)}
                        variant={isSelected ? "default" : "outline"}
                        className={`${isSelected ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                        size="sm"
                      >
                        <PlatformIcon className="h-4 w-4 mr-2" />
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goals (Optional)</label>
                <Textarea
                  placeholder="Increase brand awareness, drive website traffic, generate leads..."
                  value={newCampaign.goals || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewCampaign(prev => ({ ...prev, goals: e.target.value || null }))
                  }
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Campaign
                    </>
                  )}
                </Button>
                <Button type="button" onClick={() => setShowCreateForm(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Campaigns List */}
        <div className="lg:col-span-1">
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Target className="h-5 w-5" />
                Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaigns.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No campaigns created yet</p>
              ) : (
                campaigns.map((campaign: Campaign) => {
                  const StatusIcon = statusIcons[campaign.status];
                  const isSelected = selectedCampaign?.id === campaign.id;
                  
                  return (
                    <div
                      key={campaign.id}
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        loadCampaignMetrics(campaign.id);
                      }}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-purple-300 bg-purple-50' 
                          : 'border-gray-200 hover:border-purple-200 hover:bg-purple-25'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">{campaign.name}</h3>
                        <Badge className={`${statusColors[campaign.status]} text-xs`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {campaign.status}
                        </Badge>
                      </div>
                      
                      {campaign.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{campaign.description}</p>
                      )}
                      
                      <div className="flex items-center gap-2 mb-2">
                        {campaign.target_platforms.map(platform => {
                          const PlatformIcon = platformIcons[platform];
                          return (
                            <PlatformIcon key={platform} className="h-4 w-4 text-purple-600" />
                          );
                        })}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(campaign.start_date).toLocaleDateString()}</span>
                        {campaign.budget && (
                          <span>${campaign.budget.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Campaign Details */}
        <div className="lg:col-span-2">
          {selectedCampaign ? (
            <div className="space-y-6">
              {/* Campaign Overview */}
              <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-purple-800">
                      <BarChart3 className="h-5 w-5" />
                      {selectedCampaign.name}
                    </CardTitle>
                    <Button 
                      onClick={() => setShowMetricForm(!showMetricForm)} 
                      variant="outline" 
                      size="sm"
                      className="border-purple-300 text-purple-600 hover:bg-purple-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Metric
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCampaign.description && (
                    <p className="text-gray-600">{selectedCampaign.description}</p>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <p className="font-medium capitalize">{selectedCampaign.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Start Date:</span>
                      <p className="font-medium">{new Date(selectedCampaign.start_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">End Date:</span>
                      <p className="font-medium">
                        {selectedCampaign.end_date ? new Date(selectedCampaign.end_date).toLocaleDateString() : 'Ongoing'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Budget:</span>
                      <p className="font-medium">${selectedCampaign.budget?.toLocaleString() || 'Not set'}</p>
                    </div>
                  </div>
                  
                  {selectedCampaign.goals && (
                    <div>
                      <span className="text-gray-500 text-sm">Goals:</span>
                      <p className="text-gray-700 mt-1">{selectedCampaign.goals}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Metric Form */}
              {showMetricForm && (
                <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
                  <CardHeader>
                    <CardTitle className="text-purple-800">Add Campaign Metric</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateMetric} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                        <Select 
                          value={newMetric.platform} 
                          onValueChange={(value: SocialPlatform) => 
                            setNewMetric(prev => ({ ...prev, platform: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="x">X (Twitter)</SelectItem>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="onlyfans">OnlyFans</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Metric Name</label>
                        <Input
                          placeholder="views, likes, clicks..."
                          value={newMetric.metric_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewMetric(prev => ({ ...prev, metric_name: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                        <Input
                          type="number"
                          placeholder="1000"
                          min="0"
                          value={newMetric.metric_value}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewMetric(prev => ({ ...prev, metric_value: parseFloat(e.target.value) || 0 }))
                          }
                          required
                        />
                      </div>

                      <div className="flex items-end gap-2">
                        <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                          Add
                        </Button>
                        <Button type="button" onClick={() => setShowMetricForm(false)} variant="outline">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Metrics */}
              {campaignMetrics.length > 0 ? (
                <div className="space-y-6">
                  {/* Total Metrics */}
                  <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-800">
                        <TrendingUp className="h-5 w-5" />
                        Total Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(getTotalMetrics()).map(([metricName, value]) => {
                          const IconComponent = metricIcons[metricName] || BarChart3;
                          
                          return (
                            <div key={metricName} className="text-center p-4 bg-purple-50 rounded-lg">
                              <IconComponent className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                              <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
                              <p className="text-sm text-gray-600 capitalize">{metricName.replace('_', ' ')}</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Platform Breakdown */}
                  {Object.entries(getMetricsByPlatform()).map(([platform, metrics]) => {
                    const PlatformIcon = platformIcons[platform as SocialPlatform];
                    
                    return (
                      <Card key={platform} className="bg-white/80 backdrop-blur-sm border-purple-200">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-purple-800 capitalize">
                            <PlatformIcon className="h-5 w-5" />
                            {platform} Performance
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {metrics.map((metric: CampaignMetric) => {
                              const IconComponent = metricIcons[metric.metric_name] || BarChart3;
                              
                              return (
                                <div key={metric.id} className="text-center p-3 bg-gray-50 rounded-lg">
                                  <IconComponent className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                                  <p className="text-lg font-bold text-gray-900">{metric.metric_value.toLocaleString()}</p>
                                  <p className="text-xs text-gray-600 capitalize">{metric.metric_name.replace('_', ' ')}</p>
                                  <p className="text-xs text-gray-500">{new Date(metric.measured_at).toLocaleDateString()}</p>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
                  <CardContent className="p-12 text-center">
                    <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No metrics yet</h3>
                    <p className="text-gray-600">Add some performance metrics to track your campaign's success.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
              <CardContent className="p-12 text-center">
                <Target className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Campaign</h3>
                <p className="text-gray-600">Choose a campaign from the list to view its performance metrics.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}