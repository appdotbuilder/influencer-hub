import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  Brain, 
  CheckSquare, 
  Users,
  Instagram,
  MessageCircle,
  Video,
  Hash,
  Target,
  Clock,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { TrendsMonitor } from '@/components/TrendsMonitor';
import { ContentCreation } from '@/components/ContentCreation';
import { SchedulingDashboard } from '@/components/SchedulingDashboard';
import { CampaignMetrics } from '@/components/CampaignMetrics';
import { WorkflowManagement } from '@/components/WorkflowManagement';
import { UserProfile } from '@/components/UserProfile';
import type { User, Trend, Content, ScheduledPost, Campaign, WorkflowTask } from '../../server/src/schema';

interface DashboardStats {
  totalFollowers: number;
  pendingTasks: number;
  activeCampaigns: number;
  scheduledPosts: number;
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalFollowers: 0,
    pendingTasks: 0,
    activeCampaigns: 0,
    scheduledPosts: 0
  });
  const [recentTrends, setRecentTrends] = useState<Trend[]>([]);
  const [recentContent, setRecentContent] = useState<Content[]>([]);
  const [upcomingPosts, setUpcomingPosts] = useState<ScheduledPost[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<WorkflowTask[]>([]);

  // Load initial user (for demo, we'll use the first user or create one)
  const loadCurrentUser = useCallback(async () => {
    try {
      const users = await trpc.getUsers.query();
      if (users.length > 0) {
        setCurrentUser(users[0]);
        return users[0];
      } else {
        // Create a demo user
        const newUser = await trpc.createUser.mutate({
          email: 'demo@influencer.com',
          username: 'demoinfluencer',
          full_name: 'Demo Influencer',
          bio: 'Social media influencer and content creator 🌟',
          profile_image_url: null
        });
        setCurrentUser(newUser);
        return newUser;
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      return null;
    }
  }, []);

  // Load dashboard data
  const loadDashboardData = useCallback(async (user: User) => {
    try {
      // Load trends
      const trends = await trpc.getTrends.query({ limit: 5 });
      setRecentTrends(trends);

      // Load recent content
      const content = await trpc.getContentByUser.query({ userId: user.id });
      setRecentContent(content.slice(0, 3));

      // Load upcoming posts
      const posts = await trpc.getScheduledPostsByUser.query({ 
        userId: user.id,
        status: 'scheduled'
      });
      setUpcomingPosts(posts.slice(0, 3));

      // Load urgent tasks
      const tasks = await trpc.getWorkflowTasksByUser.query({ 
        userId: user.id,
        priority: 'urgent'
      });
      setUrgentTasks(tasks);

      // Load campaigns for stats
      const campaigns = await trpc.getCampaignsByUser.query({ 
        userId: user.id,
        status: 'active'
      });

      // Load platform accounts for follower count
      const platformAccounts = await trpc.getPlatformAccountsByUser.query({ userId: user.id });
      const totalFollowers = platformAccounts.reduce((sum, account) => sum + account.followers_count, 0);

      // Update dashboard stats
      setDashboardStats({
        totalFollowers,
        pendingTasks: tasks.filter(t => t.status === 'pending').length,
        activeCampaigns: campaigns.length,
        scheduledPosts: posts.length
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser().then(user => {
      if (user) {
        loadDashboardData(user);
      }
    });
  }, [loadCurrentUser, loadDashboardData]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-purple-600 font-medium">Loading your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-purple-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Zap className="h-8 w-8 text-purple-600" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  InfluenceHub
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser.full_name}</p>
                <p className="text-xs text-purple-600">@{currentUser.username}</p>
              </div>
              <Avatar className="h-10 w-10 ring-2 ring-purple-200">
                <AvatarImage src={currentUser.profile_image_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  {currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-8 bg-white/70 backdrop-blur-sm">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Scheduling
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="workflow" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Workflow
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Total Followers</p>
                      <p className="text-3xl font-bold">{dashboardStats.totalFollowers.toLocaleString()}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-pink-100 text-sm font-medium">Pending Tasks</p>
                      <p className="text-3xl font-bold">{dashboardStats.pendingTasks}</p>
                    </div>
                    <CheckSquare className="h-8 w-8 text-pink-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Active Campaigns</p>
                      <p className="text-3xl font-bold">{dashboardStats.activeCampaigns}</p>
                    </div>
                    <Target className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Scheduled Posts</p>
                      <p className="text-3xl font-bold">{dashboardStats.scheduledPosts}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Trends */}
              <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <TrendingUp className="h-5 w-5" />
                    Trending Now
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentTrends.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No trends available</p>
                  ) : (
                    recentTrends.map((trend: Trend) => (
                      <div key={trend.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Hash className="h-4 w-4 text-purple-600" />
                          <div>
                            <p className="font-medium text-gray-900">{trend.hashtag}</p>
                            <p className="text-sm text-gray-600 capitalize">{trend.platform}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-purple-600">
                            {trend.volume.toLocaleString()} posts
                          </p>
                          <div className="flex items-center gap-1">
                            <Progress value={trend.trending_score} className="w-12 h-2" />
                            <span className="text-xs text-gray-500">{trend.trending_score}%</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Urgent Tasks */}
              <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Urgent Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {urgentTasks.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No urgent tasks! 🎉</p>
                  ) : (
                    urgentTasks.map((task: WorkflowTask) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">URGENT</Badge>
                          {task.due_date && (
                            <div className="text-xs text-red-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Content */}
              <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <Video className="h-5 w-5" />
                    Recent Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentContent.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No content created yet</p>
                  ) : (
                    recentContent.map((content: Content) => (
                      <div key={content.id} className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">{content.title}</h3>
                          <Badge variant={content.ai_generated ? "secondary" : "outline"} className="text-xs">
                            {content.ai_generated ? "🤖 AI" : "Manual"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {content.content_type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(content.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Posts */}
              <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <Calendar className="h-5 w-5" />
                    Upcoming Posts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {upcomingPosts.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No posts scheduled</p>
                  ) : (
                    upcomingPosts.map((post: ScheduledPost) => (
                      <div key={post.id} className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">Scheduled Post</p>
                          <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
                            {post.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          {new Date(post.scheduled_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Other Tabs */}
          <TabsContent value="trends">
            <TrendsMonitor userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="content">
            <ContentCreation userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="scheduling">
            <SchedulingDashboard userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignMetrics userId={currentUser.id} />
          </TabsContent>

          <TabsContent value="workflow">
            <WorkflowManagement userId={currentUser.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;