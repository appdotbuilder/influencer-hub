import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail,
  Calendar,
  Edit,
  Plus,
  RefreshCw,
  Instagram,
  MessageCircle,
  Video,
  Facebook,
  Crown,
  Users,
  Link,
  Check,
  X
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  User as UserType, 
  PlatformAccount,
  CreatePlatformAccountInput,
  SocialPlatform 
} from '../../../server/src/schema';

interface UserProfileProps {
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

export function UserProfile({ userId }: UserProfileProps) {
  const [user, setUser] = useState<UserType | null>(null);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([]);
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Add platform form
  const [newPlatformAccount, setNewPlatformAccount] = useState<CreatePlatformAccountInput>({
    user_id: userId,
    platform: 'instagram',
    platform_user_id: '',
    username: '',
    access_token: null,
    refresh_token: null,
    token_expires_at: null,
    followers_count: 0,
    following_count: 0
  });

  const loadUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersData, platformAccountsData] = await Promise.all([
        trpc.getUsers.query(),
        trpc.getPlatformAccountsByUser.query({ userId })
      ]);
      
      const currentUser = usersData.find(u => u.id === userId);
      setUser(currentUser || null);
      setPlatformAccounts(platformAccountsData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleAddPlatformAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await trpc.createPlatformAccount.mutate(newPlatformAccount);
      setPlatformAccounts(prev => [created, ...prev]);
      setNewPlatformAccount({
        user_id: userId,
        platform: 'instagram',
        platform_user_id: '',
        username: '',
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        followers_count: 0,
        following_count: 0
      });
      setShowAddPlatform(false);
    } catch (error) {
      console.error('Failed to add platform account:', error);
    }
  };

  const getTotalFollowers = () => {
    return platformAccounts.reduce((total, account) => total + account.followers_count, 0);
  };

  const getTotalFollowing = () => {
    return platformAccounts.reduce((total, account) => total + account.following_count, 0);
  };

  const getConnectedPlatforms = () => {
    return platformAccounts.filter(account => account.is_active).length;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Profile Settings</h2>
          <p className="text-gray-600 mt-2">Manage your account and connected platforms 👤</p>
        </div>
        <Button onClick={loadUserData} variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Overview */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardContent className="p-6 text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-purple-200">
                <AvatarImage src={user.profile_image_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xl">
                  {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <h3 className="text-xl font-bold text-gray-900 mb-1">{user.full_name}</h3>
              <p className="text-purple-600 font-medium mb-3">@{user.username}</p>
              
              {user.bio && (
                <p className="text-gray-600 text-sm mb-4">{user.bio}</p>
              )}
              
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-3">
                <Calendar className="h-3 w-3" />
                Member since {new Date(user.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Users className="h-5 w-5" />
                Social Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{getTotalFollowers().toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Followers</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{getTotalFollowing().toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Following</p>
                </div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xl font-bold text-green-600">{getConnectedPlatforms()}/5</p>
                <p className="text-sm text-gray-600">Connected Platforms</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Accounts */}
        <div className="lg:col-span-2">
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Link className="h-5 w-5" />
                  Connected Platforms
                </CardTitle>
                <Button 
                  onClick={() => setShowAddPlatform(!showAddPlatform)}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Platform
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Platform Form */}
              {showAddPlatform && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-gray-900 mb-4">Connect New Platform</h4>
                  <form onSubmit={handleAddPlatformAccount} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                        <Select 
                          value={newPlatformAccount.platform} 
                          onValueChange={(value: SocialPlatform) => 
                            setNewPlatformAccount(prev => ({ ...prev, platform: value }))
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <Input
                          placeholder="your_username"
                          value={newPlatformAccount.username}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewPlatformAccount(prev => ({ ...prev, username: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Platform User ID</label>
                        <Input
                          placeholder="123456789"
                          value={newPlatformAccount.platform_user_id}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewPlatformAccount(prev => ({ ...prev, platform_user_id: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Followers</label>
                        <Input
                          type="number"
                          placeholder="1000"
                          min="0"
                          value={newPlatformAccount.followers_count || 0}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewPlatformAccount(prev => ({ ...prev, followers_count: parseInt(e.target.value) || 0 }))
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Following</label>
                        <Input
                          type="number"
                          placeholder="500"
                          min="0"
                          value={newPlatformAccount.following_count || 0}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewPlatformAccount(prev => ({ ...prev, following_count: parseInt(e.target.value) || 0 }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Connect Account
                      </Button>
                      <Button type="button" onClick={() => setShowAddPlatform(false)} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Platform Accounts List */}
              {platformAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <Link className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No platforms connected</h3>
                  <p className="text-gray-600">Connect your social media accounts to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {platformAccounts.map((account: PlatformAccount) => {
                    const PlatformIcon = platformIcons[account.platform];
                    
                    return (
                      <div key={account.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${platformColors[account.platform]}`}>
                            <PlatformIcon className="h-6 w-6" />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-gray-900 capitalize">
                                {account.platform}
                              </h3>
                              <Badge className={account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {account.is_active ? (
                                  <>
                                    <Check className="h-3 w-3 mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <X className="h-3 w-3 mr-1" />
                                    Inactive
                                  </>
                                )}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-600">@{account.username}</p>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                              <span>{account.followers_count.toLocaleString()} followers</span>
                              <span>•</span>
                              <span>{account.following_count.toLocaleString()} following</span>
                              <span>•</span>
                              <span>Connected {new Date(account.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {account.access_token && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                              <Link className="h-3 w-3 mr-1" />
                              Authenticated
                            </Badge>
                          )}
                          
                          {account.token_expires_at && new Date(account.token_expires_at) < new Date() && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                              Token Expired
                            </Badge>
                          )}
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