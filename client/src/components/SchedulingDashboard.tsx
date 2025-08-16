import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader,
  Send,
  Instagram,
  MessageCircle,
  Video,
  Facebook,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { trpc } from '@/utils/trpc';
import type { 
  ScheduledPost, 
  Content, 
  PlatformAccount,
  CreateScheduledPostInput,
  PostStatus 
} from '../../../server/src/schema';

interface SchedulingDashboardProps {
  userId: number;
}

const statusIcons = {
  draft: Loader,
  scheduled: Clock,
  published: CheckCircle,
  failed: XCircle
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800'
};

const platformIcons = {
  tiktok: Video,
  instagram: Instagram,
  x: MessageCircle,
  facebook: Facebook,
  onlyfans: Crown
};

export function SchedulingDashboard({ userId }: SchedulingDashboardProps) {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([]);
  const [filterStatus, setFilterStatus] = useState<PostStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState<CreateScheduledPostInput>({
    user_id: userId,
    content_id: 0,
    platform_account_id: 0,
    scheduled_at: new Date()
  });

  const [selectedDate, setSelectedDate] = useState<Date>();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [postsData, contentsData, accountsData] = await Promise.all([
        trpc.getScheduledPostsByUser.query({ 
          userId,
          status: filterStatus === 'all' ? undefined : filterStatus
        }),
        trpc.getContentByUser.query({ userId }),
        trpc.getPlatformAccountsByUser.query({ userId })
      ]);
      
      setScheduledPosts(postsData);
      setContents(contentsData);
      setPlatformAccounts(accountsData.filter(account => account.is_active));
    } catch (error) {
      console.error('Failed to load scheduling data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSchedulePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await trpc.createScheduledPost.mutate(scheduleForm);
      setScheduledPosts(prev => [created, ...prev]);
      setScheduleForm({
        user_id: userId,
        content_id: 0,
        platform_account_id: 0,
        scheduled_at: new Date()
      });
      setSelectedDate(undefined);
      setShowScheduleForm(false);
    } catch (error) {
      console.error('Failed to schedule post:', error);
    }
  };

  const getStatusStats = () => {
    const stats = {
      draft: 0,
      scheduled: 0,
      published: 0,
      failed: 0
    };
    
    scheduledPosts.forEach(post => {
      stats[post.status]++;
    });
    
    return stats;
  };

  const stats = getStatusStats();

  const upcomingPosts = scheduledPosts
    .filter(post => post.status === 'scheduled' && new Date(post.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Scheduling Dashboard</h2>
          <p className="text-gray-600 mt-2">Manage and schedule your posts across all platforms 📅</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowScheduleForm(!showScheduleForm)} 
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Post
          </Button>
          <Button onClick={loadData} variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Drafts</p>
                <p className="text-3xl font-bold text-gray-900">{stats.draft}</p>
              </div>
              <Loader className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Scheduled</p>
                <p className="text-3xl font-bold text-blue-900">{stats.scheduled}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Published</p>
                <p className="text-3xl font-bold text-green-900">{stats.published}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Failed</p>
                <p className="text-3xl font-bold text-red-900">{stats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Form */}
      {showScheduleForm && (
        <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <CalendarIcon className="h-5 w-5" />
              Schedule New Post
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSchedulePost} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <Select 
                    value={scheduleForm.content_id.toString()} 
                    onValueChange={(value: string) => 
                      setScheduleForm(prev => ({ ...prev, content_id: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select content" />
                    </SelectTrigger>
                    <SelectContent>
                      {contents.map(content => (
                        <SelectItem key={content.id} value={content.id.toString()}>
                          {content.title} ({content.content_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform Account</label>
                  <Select 
                    value={scheduleForm.platform_account_id.toString()} 
                    onValueChange={(value: string) => 
                      setScheduleForm(prev => ({ ...prev, platform_account_id: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platformAccounts.map(account => {
                        const PlatformIcon = platformIcons[account.platform];
                        return (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            <div className="flex items-center gap-2">
                              <PlatformIcon className="h-4 w-4" />
                              {account.username} ({account.platform})
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Date & Time</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          if (date) {
                            const newDateTime = new Date(scheduleForm.scheduled_at);
                            newDateTime.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                            setScheduleForm(prev => ({ ...prev, scheduled_at: newDateTime }));
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={format(scheduleForm.scheduled_at, 'HH:mm')}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDateTime = new Date(scheduleForm.scheduled_at);
                      newDateTime.setHours(parseInt(hours), parseInt(minutes));
                      setScheduleForm(prev => ({ ...prev, scheduled_at: newDateTime }));
                    }}
                    className="w-32"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={!scheduleForm.content_id || !scheduleForm.platform_account_id}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Schedule Post
                </Button>
                <Button type="button" onClick={() => setShowScheduleForm(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Posts */}
        <div className="lg:col-span-1">
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Clock className="h-5 w-5" />
                Upcoming Posts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingPosts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No upcoming posts scheduled</p>
              ) : (
                upcomingPosts.map((post: ScheduledPost) => {
                  const content = contents.find(c => c.id === post.content_id);
                  const account = platformAccounts.find(a => a.id === post.platform_account_id);
                  const PlatformIcon = account ? platformIcons[account.platform] : Clock;
                  
                  return (
                    <div key={post.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 text-sm">
                          {content?.title || 'Unknown Content'}
                        </h3>
                        <div className="flex items-center gap-1">
                          <PlatformIcon className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{account?.username || 'Unknown Account'}</span>
                        <span>{new Date(post.scheduled_at).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Posts */}
        <div className="lg:col-span-2">
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <CalendarIcon className="h-5 w-5" />
                  All Scheduled Posts
                </CardTitle>
                <Select value={filterStatus} onValueChange={(value: PostStatus | 'all') => setFilterStatus(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : scheduledPosts.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
                  <p className="text-gray-600">Schedule your first post to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduledPosts.map((post: ScheduledPost) => {
                    const content = contents.find(c => c.id === post.content_id);
                    const account = platformAccounts.find(a => a.id === post.platform_account_id);
                    const StatusIcon = statusIcons[post.status];
                    const PlatformIcon = account ? platformIcons[account.platform] : Clock;
                    
                    return (
                      <div key={post.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <PlatformIcon className="h-5 w-5 text-purple-600" />
                              <h3 className="font-semibold text-gray-900">
                                {content?.title || 'Unknown Content'}
                              </h3>
                              <Badge className={`${statusColors[post.status]} text-xs`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {post.status}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{account?.username || 'Unknown Account'}</span>
                              <span>•</span>
                              <span className="capitalize">{account?.platform || 'Unknown Platform'}</span>
                              <span>•</span>
                              <span>{content?.content_type || 'Unknown Type'}</span>
                            </div>
                            
                            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Scheduled: {new Date(post.scheduled_at).toLocaleString()}
                              </div>
                              {post.published_at && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  Published: {new Date(post.published_at).toLocaleString()}
                                </div>
                              )}
                            </div>
                            
                            {post.error_message && (
                              <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                                <div className="flex items-center gap-1 text-sm text-red-700">
                                  <AlertTriangle className="h-4 w-4" />
                                  {post.error_message}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}