import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Plus, 
  Wand2, 
  Video, 
  Image, 
  FileText,
  Instagram,
  MessageCircle,
  Facebook,
  Crown,
  Hash,
  Sparkles,
  Copy,
  RefreshCw,
  Eye
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Content, 
  AIContentRequest, 
  CreateContentInput, 
  CreateAIContentRequestInput,
  ContentType,
  SocialPlatform 
} from '../../../server/src/schema';

interface ContentCreationProps {
  userId: number;
}

const contentTypeIcons = {
  post: FileText,
  story: Image,
  reel: Video,
  video: Video,
  image: Image
};

const platformIcons = {
  tiktok: Video,
  instagram: Instagram,
  x: MessageCircle,
  facebook: Facebook,
  onlyfans: Crown
};

export function ContentCreation({ userId }: ContentCreationProps) {
  const [contents, setContents] = useState<Content[]>([]);
  const [aiRequests, setAiRequests] = useState<AIContentRequest[]>([]);
  const [activeTab, setActiveTab] = useState('create');
  const [isLoading, setIsLoading] = useState(false);

  // Manual content form
  const [manualContent, setManualContent] = useState<CreateContentInput>({
    user_id: userId,
    title: '',
    description: null,
    content_type: 'post',
    ai_generated: false,
    script: null,
    media_urls: [],
    hashtags: []
  });

  // AI content form
  const [aiContentRequest, setAiContentRequest] = useState<CreateAIContentRequestInput>({
    user_id: userId,
    prompt: '',
    content_type: 'post',
    platform: 'instagram'
  });

  const [newHashtag, setNewHashtag] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');

  const loadContent = useCallback(async () => {
    try {
      const [contentData, aiData] = await Promise.all([
        trpc.getContentByUser.query({ userId }),
        trpc.getAIContentRequestsByUser.query({ userId })
      ]);
      setContents(contentData);
      setAiRequests(aiData);
    } catch (error) {
      console.error('Failed to load content:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleCreateManualContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const created = await trpc.createContent.mutate(manualContent);
      setContents(prev => [created, ...prev]);
      setManualContent({
        user_id: userId,
        title: '',
        description: null,
        content_type: 'post',
        ai_generated: false,
        script: null,
        media_urls: [],
        hashtags: []
      });
    } catch (error) {
      console.error('Failed to create content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAIRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const created = await trpc.createAIContentRequest.mutate(aiContentRequest);
      setAiRequests(prev => [created, ...prev]);
      setAiContentRequest({
        user_id: userId,
        prompt: '',
        content_type: 'post',
        platform: 'instagram'
      });
    } catch (error) {
      console.error('Failed to create AI request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addHashtag = () => {
    if (newHashtag.trim() && !manualContent.hashtags?.includes(newHashtag.trim())) {
      setManualContent(prev => ({
        ...prev,
        hashtags: [...(prev.hashtags || []), newHashtag.trim()]
      }));
      setNewHashtag('');
    }
  };

  const removeHashtag = (index: number) => {
    setManualContent(prev => ({
      ...prev,
      hashtags: (prev.hashtags || []).filter((_, i) => i !== index)
    }));
  };

  const addMediaUrl = () => {
    if (newMediaUrl.trim() && !manualContent.media_urls?.includes(newMediaUrl.trim())) {
      setManualContent(prev => ({
        ...prev,
        media_urls: [...(prev.media_urls || []), newMediaUrl.trim()]
      }));
      setNewMediaUrl('');
    }
  };

  const removeMediaUrl = (index: number) => {
    setManualContent(prev => ({
      ...prev,
      media_urls: (prev.media_urls || []).filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Content Creation</h2>
          <p className="text-gray-600 mt-2">Create engaging content with AI assistance or manually 🎨</p>
        </div>
        <Button onClick={loadContent} variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-white/70 backdrop-blur-sm">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Content
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Content Library
          </TabsTrigger>
        </TabsList>

        {/* Manual Content Creation */}
        <TabsContent value="create">
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Plus className="h-5 w-5" />
                Create New Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateManualContent} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <Input
                      placeholder="My amazing content"
                      value={manualContent.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setManualContent(prev => ({ ...prev, title: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                    <Select 
                      value={manualContent.content_type} 
                      onValueChange={(value: ContentType) => 
                        setManualContent(prev => ({ ...prev, content_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="post">Post</SelectItem>
                        <SelectItem value="story">Story</SelectItem>
                        <SelectItem value="reel">Reel</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <Textarea
                    placeholder="Describe your content..."
                    value={manualContent.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setManualContent(prev => ({ ...prev, description: e.target.value || null }))
                    }
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Script (Optional)</label>
                  <Textarea
                    placeholder="Script or caption for your content..."
                    value={manualContent.script || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setManualContent(prev => ({ ...prev, script: e.target.value || null }))
                    }
                    rows={4}
                  />
                </div>

                {/* Hashtags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="#hashtag"
                      value={newHashtag}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewHashtag(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addHashtag();
                        }
                      }}
                    />
                    <Button type="button" onClick={addHashtag} variant="outline" size="sm">
                      <Hash className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {manualContent.hashtags?.map((hashtag, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-red-100"
                        onClick={() => removeHashtag(index)}
                      >
                        {hashtag} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Media URLs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Media URLs</label>
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="https://example.com/image.jpg"
                      type="url"
                      value={newMediaUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMediaUrl(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addMediaUrl();
                        }
                      }}
                    />
                    <Button type="button" onClick={addMediaUrl} variant="outline" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {manualContent.media_urls?.map((url, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="text-sm flex-1 truncate">{url}</span>
                        <Button 
                          type="button" 
                          onClick={() => removeMediaUrl(index)} 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Content
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Assistant */}
        <TabsContent value="ai">
          <div className="space-y-6">
            {/* AI Request Form */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Brain className="h-5 w-5" />
                  AI Content Generator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAIRequest} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                      <Select 
                        value={aiContentRequest.platform} 
                        onValueChange={(value: SocialPlatform) => 
                          setAiContentRequest(prev => ({ ...prev, platform: value }))
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                      <Select 
                        value={aiContentRequest.content_type} 
                        onValueChange={(value: ContentType) => 
                          setAiContentRequest(prev => ({ ...prev, content_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="post">Post</SelectItem>
                          <SelectItem value="story">Story</SelectItem>
                          <SelectItem value="reel">Reel</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="image">Image</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content Prompt</label>
                    <Textarea
                      placeholder="Create a funny video about cooking fails that would go viral on TikTok..."
                      value={aiContentRequest.prompt}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setAiContentRequest(prev => ({ ...prev, prompt: e.target.value }))
                      }
                      rows={4}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Be specific about your content ideas, target audience, and desired tone.
                    </p>
                  </div>

                  <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Content
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* AI Requests */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent AI Requests</h3>
              {aiRequests.length === 0 ? (
                <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
                  <CardContent className="p-8 text-center">
                    <Brain className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600">No AI requests yet. Try generating some content!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {aiRequests.map((request: AIContentRequest) => {
                    const PlatformIcon = platformIcons[request.platform];
                    const ContentTypeIcon = contentTypeIcons[request.content_type];
                    
                    return (
                      <Card key={request.id} className="bg-white/80 backdrop-blur-sm border-purple-200">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <PlatformIcon className="h-5 w-5 text-purple-600" />
                                  <ContentTypeIcon className="h-5 w-5 text-gray-600" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium capitalize">{request.platform}</span>
                                    <span className="text-gray-500">•</span>
                                    <span className="text-sm text-gray-600 capitalize">{request.content_type}</span>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {new Date(request.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <Badge className={`${getStatusColor(request.status)}`}>
                                {request.status}
                              </Badge>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-700">{request.prompt}</p>
                            </div>

                            {request.generated_content && (
                              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-green-800">Generated Content:</span>
                                  <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-800">
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-sm text-green-700 whitespace-pre-wrap">{request.generated_content}</p>
                              </div>
                            )}

                            {request.error_message && (
                              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                <span className="text-sm font-medium text-red-800">Error:</span>
                                <p className="text-sm text-red-700">{request.error_message}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Content Library */}
        <TabsContent value="library">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Your Content Library</h3>
            {contents.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">No content created yet. Start creating some content!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contents.map((content: Content) => {
                  const ContentTypeIcon = contentTypeIcons[content.content_type];
                  
                  return (
                    <Card key={content.id} className="bg-white/80 backdrop-blur-sm border-purple-200 hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <ContentTypeIcon className="h-5 w-5 text-purple-600" />
                              <h3 className="font-semibold text-gray-900 truncate">{content.title}</h3>
                            </div>
                            <Badge variant={content.ai_generated ? "secondary" : "outline"} className="text-xs">
                              {content.ai_generated ? "🤖 AI" : "Manual"}
                            </Badge>
                          </div>

                          {content.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{content.description}</p>
                          )}

                          {content.hashtags && content.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {content.hashtags.slice(0, 3).map((hashtag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {hashtag}
                                </Badge>
                              ))}
                              {content.hashtags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{content.hashtags.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}

                          <Separator />

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="capitalize">{content.content_type}</span>
                            <span>{new Date(content.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}