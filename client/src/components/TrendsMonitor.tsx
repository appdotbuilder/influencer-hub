import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  Hash, 
  Filter, 
  RefreshCw,
  Instagram,
  MessageCircle,
  Video,
  Facebook,
  Crown,
  Plus
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Trend, SocialPlatform, CreateTrendInput } from '../../../server/src/schema';

interface TrendsMonitorProps {
  userId: number;
}

const platformIcons = {
  tiktok: Video,
  instagram: Instagram,
  x: MessageCircle,
  facebook: Facebook,
  onlyfans: Crown
};

const platformColors = {
  tiktok: 'bg-black text-white',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  x: 'bg-blue-500 text-white',
  facebook: 'bg-blue-600 text-white',
  onlyfans: 'bg-blue-400 text-white'
};

export function TrendsMonitor({ userId }: TrendsMonitorProps) {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [filteredTrends, setFilteredTrends] = useState<Trend[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newTrend, setNewTrend] = useState<CreateTrendInput>({
    platform: 'tiktok',
    hashtag: '',
    keyword: null,
    volume: 0,
    engagement_rate: 0,
    sentiment_score: 0,
    trending_score: 0
  });

  const loadTrends = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getTrends.query({ 
        platform: selectedPlatform === 'all' ? undefined : selectedPlatform,
        limit: 50 
      });
      setTrends(result);
      setFilteredTrends(result);
    } catch (error) {
      console.error('Failed to load trends:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPlatform]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  useEffect(() => {
    let filtered = trends;
    
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(trend => trend.platform === selectedPlatform);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(trend => 
        trend.hashtag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trend.keyword && trend.keyword.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Sort by trending score
    filtered = filtered.sort((a, b) => b.trending_score - a.trending_score);
    
    setFilteredTrends(filtered);
  }, [trends, selectedPlatform, searchTerm]);

  const handleCreateTrend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await trpc.createTrend.mutate(newTrend);
      setTrends(prev => [created, ...prev]);
      setNewTrend({
        platform: 'tiktok',
        hashtag: '',
        keyword: null,
        volume: 0,
        engagement_rate: 0,
        sentiment_score: 0,
        trending_score: 0
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to create trend:', error);
    }
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-green-600 bg-green-50';
    if (score < -0.3) return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.3) return 'Positive';
    if (score < -0.3) return 'Negative';
    return 'Neutral';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Trend Monitoring</h2>
          <p className="text-gray-600 mt-2">Stay ahead with real-time social media trends across all platforms 📈</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowAddForm(!showAddForm)} 
            variant="outline" 
            size="sm"
            className="border-purple-300 text-purple-600 hover:bg-purple-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Trend
          </Button>
          <Button 
            onClick={loadTrends} 
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Add Trend Form */}
      {showAddForm && (
        <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-800">Add New Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTrend} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <Select 
                  value={newTrend.platform} 
                  onValueChange={(value: SocialPlatform) => 
                    setNewTrend(prev => ({ ...prev, platform: value }))
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Hashtag</label>
                <Input
                  placeholder="#trending"
                  value={newTrend.hashtag}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewTrend(prev => ({ ...prev, hashtag: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keyword (Optional)</label>
                <Input
                  placeholder="viral content"
                  value={newTrend.keyword || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewTrend(prev => ({ ...prev, keyword: e.target.value || null }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Volume</label>
                <Input
                  type="number"
                  placeholder="1000"
                  min="0"
                  value={newTrend.volume}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewTrend(prev => ({ ...prev, volume: parseInt(e.target.value) || 0 }))
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Engagement Rate (%)</label>
                <Input
                  type="number"
                  placeholder="5.5"
                  min="0"
                  max="100"
                  step="0.1"
                  value={newTrend.engagement_rate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewTrend(prev => ({ ...prev, engagement_rate: parseFloat(e.target.value) || 0 }))
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sentiment Score (-1 to 1)</label>
                <Input
                  type="number"
                  placeholder="0.5"
                  min="-1"
                  max="1"
                  step="0.1"
                  value={newTrend.sentiment_score}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewTrend(prev => ({ ...prev, sentiment_score: parseFloat(e.target.value) || 0 }))
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trending Score (%)</label>
                <Input
                  type="number"
                  placeholder="85"
                  min="0"
                  max="100"
                  value={newTrend.trending_score}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewTrend(prev => ({ ...prev, trending_score: parseFloat(e.target.value) || 0 }))
                  }
                  required
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Add Trend
                </Button>
                <Button type="button" onClick={() => setShowAddForm(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filter by:</span>
            </div>
            
            <Select value={selectedPlatform} onValueChange={(value: SocialPlatform | 'all') => setSelectedPlatform(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="x">X (Twitter)</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="onlyfans">OnlyFans</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search hashtags or keywords..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="flex-1 max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trends Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="bg-white/80 backdrop-blur-sm animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTrends.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No trends found</h3>
            <p className="text-gray-600">Try adjusting your filters or add some trends manually.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrends.map((trend: Trend) => {
            const PlatformIcon = platformIcons[trend.platform];
            return (
              <Card key={trend.id} className="bg-white/80 backdrop-blur-sm border-purple-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hash className="h-5 w-5 text-purple-600" />
                        <h3 className="font-bold text-lg text-gray-900">{trend.hashtag}</h3>
                      </div>
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${platformColors[trend.platform]}`}>
                        <PlatformIcon className="h-3 w-3" />
                        {trend.platform.toUpperCase()}
                      </div>
                    </div>

                    {/* Keyword */}
                    {trend.keyword && (
                      <p className="text-sm text-gray-600">Related: {trend.keyword}</p>
                    )}

                    <Separator />

                    {/* Metrics */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Volume</span>
                        <span className="text-sm font-bold text-gray-900">
                          {trend.volume.toLocaleString()} posts
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Trending Score</span>
                          <span className="text-sm font-bold text-purple-600">{trend.trending_score}%</span>
                        </div>
                        <Progress value={trend.trending_score} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Engagement</span>
                        <span className="text-sm font-bold text-green-600">{trend.engagement_rate}%</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Sentiment</span>
                        <Badge className={`text-xs ${getSentimentColor(trend.sentiment_score)}`}>
                          {getSentimentLabel(trend.sentiment_score)}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Footer */}
                    <div className="text-xs text-gray-500">
                      Detected {new Date(trend.detected_at).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}