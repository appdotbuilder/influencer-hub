import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { 
  CheckSquare, 
  Plus, 
  RefreshCw,
  Calendar as CalendarIcon,
  Clock,
  User,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  Users,
  Filter,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { trpc } from '@/utils/trpc';
import type { 
  WorkflowTask, 
  Campaign,
  Content,
  CreateWorkflowTaskInput,
  WorkflowStatus,
  PriorityLevel 
} from '../../../server/src/schema';

interface WorkflowManagementProps {
  userId: number;
}

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  completed: CheckSquare
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export function WorkflowManagement({ userId }: WorkflowManagementProps) {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<WorkflowStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<PriorityLevel | 'all'>('all');

  // Create task form
  const [newTask, setNewTask] = useState<CreateWorkflowTaskInput>({
    user_id: userId,
    campaign_id: null,
    content_id: null,
    title: '',
    description: null,
    priority: 'medium',
    assigned_to: null,
    due_date: null
  });

  const [dueDate, setDueDate] = useState<Date>();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasksData, campaignsData, contentsData, usersData] = await Promise.all([
        trpc.getWorkflowTasksByUser.query({ 
          userId,
          status: filterStatus === 'all' ? undefined : filterStatus,
          priority: filterPriority === 'all' ? undefined : filterPriority
        }),
        trpc.getCampaignsByUser.query({ userId }),
        trpc.getContentByUser.query({ userId }),
        trpc.getUsers.query()
      ]);
      
      setTasks(tasksData);
      setCampaigns(campaignsData);
      setContents(contentsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load workflow data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, filterStatus, filterPriority]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await trpc.createWorkflowTask.mutate(newTask);
      setTasks(prev => [created, ...prev]);
      setNewTask({
        user_id: userId,
        campaign_id: null,
        content_id: null,
        title: '',
        description: null,
        priority: 'medium',
        assigned_to: null,
        due_date: null
      });
      setDueDate(undefined);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: WorkflowStatus) => {
    try {
      await trpc.updateWorkflowTaskStatus.mutate({ taskId, status: newStatus });
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus, completed_at: newStatus === 'completed' ? new Date() : null }
          : task
      ));
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getTaskStats = () => {
    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      overdue: 0
    };
    
    tasks.forEach(task => {
      stats[task.status]++;
      
      if (task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed') {
        stats.overdue++;
      }
    });
    
    return stats;
  };

  const stats = getTaskStats();

  const urgentTasks = tasks.filter(task => 
    task.priority === 'urgent' && task.status !== 'completed'
  ).slice(0, 5);

  const upcomingDeadlines = tasks
    .filter(task => 
      task.due_date && 
      new Date(task.due_date) > new Date() && 
      task.status !== 'completed'
    )
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Workflow Management</h2>
          <p className="text-gray-600 mt-2">Organize tasks, track approvals, and manage deadlines ✅</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)} 
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
          <Button onClick={loadData} variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Approved</p>
                <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Rejected</p>
                <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
              </div>
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold text-blue-900">{stats.completed}</p>
              </div>
              <CheckSquare className="h-6 w-6 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Overdue</p>
                <p className="text-2xl font-bold text-orange-900">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Plus className="h-5 w-5" />
              Create New Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTask} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                  <Input
                    placeholder="Review campaign content"
                    value={newTask.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewTask(prev => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <Select 
                    value={newTask.priority} 
                    onValueChange={(value: PriorityLevel) => 
                      setNewTask(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Textarea
                  placeholder="Describe the task requirements and expectations..."
                  value={newTask.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewTask(prev => ({ ...prev, description: e.target.value || null }))
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Related Campaign (Optional)</label>
                  <Select 
                    value={newTask.campaign_id?.toString() || 'none'} 
                    onValueChange={(value: string) => 
                      setNewTask(prev => ({ ...prev, campaign_id: value === 'none' ? null : parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No campaign</SelectItem>
                      {campaigns.map(campaign => (
                        <SelectItem key={campaign.id} value={campaign.id.toString()}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Related Content (Optional)</label>
                  <Select 
                    value={newTask.content_id?.toString() || 'none'} 
                    onValueChange={(value: string) => 
                      setNewTask(prev => ({ ...prev, content_id: value === 'none' ? null : parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select content" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No content</SelectItem>
                      {contents.map(content => (
                        <SelectItem key={content.id} value={content.id.toString()}>
                          {content.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To (Optional)</label>
                  <Select 
                    value={newTask.assigned_to?.toString() || 'none'} 
                    onValueChange={(value: string) => 
                      setNewTask(prev => ({ ...prev, assigned_to: value === 'none' ? null : parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.full_name} (@{user.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'PPP') : 'Select due date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => {
                        setDueDate(date);
                        setNewTask(prev => ({ ...prev, due_date: date }));
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
                <Button type="button" onClick={() => setShowCreateForm(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Urgent Tasks */}
          <Card className="bg-white/80 backdrop-blur-sm border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                Urgent Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgentTasks.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No urgent tasks! 🎉</p>
              ) : (
                urgentTasks.map((task: WorkflowTask) => (
                  <div key={task.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <h3 className="font-medium text-gray-900 text-sm mb-1">{task.title}</h3>
                    <div className="flex items-center justify-between">
                      <Badge className={`${statusColors[task.status]} text-xs`}>
                        {task.status}
                      </Badge>
                      {task.due_date && (
                        <span className="text-xs text-red-600">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Clock className="h-5 w-5" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No upcoming deadlines</p>
              ) : (
                upcomingDeadlines.map((task: WorkflowTask) => (
                  <div key={task.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-gray-900 text-sm mb-1">{task.title}</h3>
                    <div className="flex items-center justify-between">
                      <Badge className={`${priorityColors[task.priority]} text-xs`}>
                        {task.priority}
                      </Badge>
                      <span className="text-xs text-blue-600">
                        {new Date(task.due_date!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tasks List */}
        <div className="lg:col-span-3">
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <CheckSquare className="h-5 w-5" />
                  All Tasks
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={filterStatus} onValueChange={(value: WorkflowStatus | 'all') => setFilterStatus(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterPriority} onValueChange={(value: PriorityLevel | 'all') => setFilterPriority(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                  <p className="text-gray-600">Create your first task to get organized!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task: WorkflowTask) => {
                    const StatusIcon = statusIcons[task.status];
                    const campaign = campaigns.find(c => c.id === task.campaign_id);
                    const content = contents.find(c => c.id === task.content_id);
                    const assignedUser = users.find(u => u.id === task.assigned_to);
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                    
                    return (
                      <div key={task.id} className={`p-6 border rounded-lg hover:shadow-sm transition-shadow ${
                        isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{task.title}</h3>
                              <Badge className={`${statusColors[task.status]} text-xs`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {task.status}
                              </Badge>
                              <Badge className={`${priorityColors[task.priority]} text-xs`}>
                                {task.priority}
                              </Badge>
                              {isOverdue && (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            
                            {task.description && (
                              <p className="text-gray-600 mb-3">{task.description}</p>
                            )}
                            
                            <div className="flex items-center gap-6 text-sm text-gray-500">
                              {campaign && (
                                <div className="flex items-center gap-1">
                                  <Target className="h-4 w-4" />
                                  {campaign.name}
                                </div>
                              )}
                              
                              {content && (
                                <div className="flex items-center gap-1">
                                  <CheckSquare className="h-4 w-4" />
                                  {content.title}
                                </div>
                              )}
                              
                              {assignedUser && (
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  {assignedUser.full_name}
                                </div>
                              )}
                              
                              {task.due_date && (
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-4 w-4" />
                                  {new Date(task.due_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {task.status !== 'completed' && (
                              <Select 
                                value={task.status} 
                                onValueChange={(value: WorkflowStatus) => handleStatusChange(task.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                          <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
                          {task.completed_at && (
                            <span>Completed {new Date(task.completed_at).toLocaleDateString()}</span>
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