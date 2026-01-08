import React from 'react';
import { EnhancedSectionCard } from './EnhancedSectionCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  Edit,
  Camera,
  Bell,
  MessageSquare,
  FileText,
  Church,
  Calendar,
  TrendingUp,
  Users,
  Star,
  Send,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  Globe,
  Heart,
  ChevronRight
} from 'lucide-react';
import { ChurchInfo, FeedbackItem, AnnouncementItem, PhotoItem } from './types';

interface ParishDashboardShellProps {
  churchInfo: ChurchInfo;
  stats: { totalPhotos: number; announcements: number; feedback: number; avgRating: string };
  announcements: AnnouncementItem[];
  photos: PhotoItem[];
  feedback: FeedbackItem[];
  completionPercentage: number;
  onEditProfile: () => void;
  onUpdateSchedules: () => void;
  onUploadMedia: () => void;
  onNewAnnouncement: () => void;
  onRespondFeedback: () => void;
  onSubmitForReview: () => void;
  onOpenReports: () => void;
  status: string;
}

export const ParishDashboardShell: React.FC<ParishDashboardShellProps> = ({
  churchInfo,
  stats,
  announcements,
  photos,
  feedback,
  completionPercentage,
  onEditProfile,
  onUpdateSchedules,
  onUploadMedia,
  onNewAnnouncement,
  onRespondFeedback,
  onSubmitForReview,
  onOpenReports,
  status
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved & Live
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition-colors">
            <Clock className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        );
      case 'heritage_review':
        return (
          <Badge className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 transition-colors">
            <Clock className="w-3 h-3 mr-1" />
            Heritage Review
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 transition-colors">
            <Edit className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'approved':
        return "Your church profile is live and visitors can discover you!";
      case 'pending':
        return "Your submission is being reviewed by the diocesan office.";
      case 'heritage_review':
        return "Your church is being reviewed for heritage classification.";
      default:
        return "Complete your church profile to share your parish with the world.";
    }
  };

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 p-6 -m-6">
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-slate-200/60">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600"></div>
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gradient-to-bl from-purple-400/20 to-transparent transform translate-x-32 -translate-y-32"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-gradient-to-tr from-blue-400/20 to-transparent transform -translate-x-24 translate-y-24"></div>
        </div>
        
        <div className="relative p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div className="flex-1">
              {/* Welcome Section */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Church className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    {getGreeting()}! 👋
                  </h1>
                  <h2 className="text-2xl font-semibold text-slate-800 mb-1">
                    {churchInfo.name || "Your Parish"}
                  </h2>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    {getStatusMessage()}
                  </p>
                </div>
              </div>

              {/* Status and Info Row */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <Badge variant="outline" className="border-slate-300 text-slate-700 px-3 py-1">
                  <Users className="w-4 h-4 mr-2" />
                  Parish Secretary
                </Badge>
                {getStatusBadge()}
                {churchInfo.location && (
                  <Badge variant="outline" className="border-slate-300 text-slate-700 px-3 py-1">
                    <MapPin className="w-4 h-4 mr-2" />
                    {churchInfo.location}
                  </Badge>
                )}
              </div>

              {/* Enhanced Progress Section */}
              <Card className="border-slate-200 bg-slate-50/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-slate-800">Profile Completion</span>
                    </div>
                    <span className="text-lg font-bold text-purple-600">{completionPercentage}%</span>
                  </div>
                  <Progress 
                    value={completionPercentage} 
                    className="h-3 mb-3 bg-slate-200"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-slate-600">
                      {completionPercentage === 100 ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="w-4 h-4" />
                          Profile is complete!
                        </span>
                      ) : (
                        `Complete ${100 - completionPercentage}% more to finish your profile`
                      )}
                    </p>
                    {completionPercentage < 100 && (
                      <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                        View Missing Fields
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Access to Profile Form */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Button 
                  onClick={onEditProfile}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  {completionPercentage < 100 ? 'Complete Church Profile' : 'Edit Church Profile'}
                </Button>
                {status === 'draft' && (
                  <Button 
                    variant="outline" 
                    onClick={onSubmitForReview}
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit for Review
                  </Button>
                )}
              </div>
            </div>

            {/* Action Panel */}
            <div className="flex flex-col gap-4 lg:w-80">
              <Card className="border-slate-200 bg-gradient-to-br from-purple-50 to-blue-50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-purple-600" />
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <Button
                      size="lg"
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                      onClick={onSubmitForReview}
                      disabled={status === 'pending'}
                    >
                      <Send className="w-5 h-5 mr-2" />
                      {status === 'pending' ? 'Under Review...' : 
                       status === 'approved' ? 'Update Profile' : 'Submit for Review'}
                    </Button>
                    
                    {status === 'approved' && (
                      <>
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full border-slate-300 hover:bg-slate-50"
                          onClick={onNewAnnouncement}
                        >
                          <Bell className="w-5 h-5 mr-2" />
                          New Announcement
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full border-slate-300 hover:bg-slate-50"
                          onClick={onRespondFeedback}
                        >
                          <MessageSquare className="w-5 h-5 mr-2" />
                          Respond to Reviews
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info Display */}
              {(churchInfo.contactInfo?.phone || churchInfo.contactInfo?.email || churchInfo.contactInfo?.website) && (
                <Card className="border-slate-200">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-slate-800 mb-4">Contact Information</h3>
                    <div className="space-y-3 text-sm">
                      {churchInfo.contactInfo?.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4" />
                          {churchInfo.contactInfo.phone}
                        </div>
                      )}
                      {churchInfo.contactInfo?.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4" />
                          {churchInfo.contactInfo.email}
                        </div>
                      )}
                      {churchInfo.contactInfo?.website && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Globe className="w-4 h-4" />
                          {churchInfo.contactInfo.website}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Analytics Cards - Only show when approved */}
      {status === 'approved' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200 bg-white hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                    {stats.totalPhotos}
                  </p>
                  <p className="text-sm font-medium text-slate-600 mt-1">Total Photos</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center group-hover:from-purple-200 group-hover:to-purple-300 transition-all">
                  <Camera className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
                <TrendingUp className="w-4 h-4" />
                <span>View Gallery</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    {stats.announcements}
                  </p>
                  <p className="text-sm font-medium text-slate-600 mt-1">Announcements</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center group-hover:from-emerald-200 group-hover:to-emerald-300 transition-all">
                  <Bell className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
                <TrendingUp className="w-4 h-4" />
                <span>Manage Posts</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    {stats.feedback}
                  </p>
                  <p className="text-sm font-medium text-slate-600 mt-1">Visitor Reviews</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center group-hover:from-emerald-200 group-hover:to-emerald-300 transition-all">
                  <MessageSquare className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
                <TrendingUp className="w-4 h-4" />
                <span>Respond Now</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                    {stats.avgRating}
                  </p>
                  <p className="text-sm font-medium text-slate-600 mt-1">Average Rating</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center group-hover:from-amber-200 group-hover:to-amber-300 transition-all">
                  <Star className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3 h-3 ${i < Math.floor(parseFloat(stats.avgRating)) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} 
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="parish-section-grid">
        {/* Only show these sections after approval */}
        {status === 'approved' && (
          <>
            <EnhancedSectionCard
              title="Mass Schedules"
              description="Manage mass times and special events"
              status={churchInfo.massSchedules.length > 0 ? 'complete' : 'incomplete'}
              count={churchInfo.massSchedules.length}
              icon={<Calendar className="w-5 h-5" />}
              primaryAction={{
                label: 'Update Times',
                onClick: onUpdateSchedules
              }}
              priority={churchInfo.massSchedules.length === 0 ? 'high' : 'normal'}
            >
              <div className="space-y-2">
                {churchInfo.massSchedules.slice(0,3).map((m, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-purple-50 rounded-lg text-sm">
                    <span className="font-medium text-purple-800">{m.day}</span>
                    <span className="text-purple-700">{m.time}</span>
                  </div>
                ))}
                {churchInfo.massSchedules.length > 3 && (
                  <p className="text-xs text-purple-500 text-center mt-2">
                    + {churchInfo.massSchedules.length - 3} more schedules
                  </p>
                )}
                {churchInfo.massSchedules.length === 0 && (
                  <div className="text-center py-4">
                    <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No schedules added yet</p>
                  </div>
                )}
              </div>
            </EnhancedSectionCard>

            <EnhancedSectionCard
              title="Media Library"
              description="Photos, 360° tours & documents"
              status={stats.totalPhotos > 0 ? 'complete' : 'incomplete'}
              count={stats.totalPhotos}
              icon={<Camera className="w-5 h-5" />}
              primaryAction={{
                label: 'Upload Media',
                onClick: onUploadMedia
              }}
              secondaryAction={{
                label: 'Manage All',
                onClick: onUploadMedia
              }}
              priority={stats.totalPhotos === 0 ? 'high' : 'normal'}
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-teal-900">{stats.totalPhotos}</div>
                  <div className="text-xs text-teal-600">Total Photos</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-900">{photos.filter(p=>p.status==='approved').length}</div>
                  <div className="text-xs text-green-600">Approved</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-orange-900">{photos.filter(p=>p.status==='pending').length}</div>
                  <div className="text-xs text-orange-600">Pending</div>
                </div>
              </div>
            </EnhancedSectionCard>

            <EnhancedSectionCard
              title="Announcements"
              description="Share parish news & events"
              status={announcements.length > 0 ? 'complete' : 'incomplete'}
              count={announcements.length}
              icon={<Bell className="w-5 h-5" />}
              primaryAction={{
                label: 'New Announcement',
                onClick: onNewAnnouncement
              }}
              secondaryAction={{
                label: 'View All',
                onClick: onNewAnnouncement
              }}
            >
              <div className="space-y-2">
                {announcements.slice(0,2).map((announcement, i) => (
                  <div key={i} className="p-3 bg-emerald-50 rounded-lg">
                    <h4 className="font-medium text-emerald-900 text-sm mb-1">{announcement.title}</h4>
                    <p className="text-xs text-emerald-600">{announcement.date}</p>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="text-center py-4">
                    <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No announcements yet</p>
                  </div>
                )}
              </div>
            </EnhancedSectionCard>

            <EnhancedSectionCard
              title="Visitor Reviews"
              description="Engage with your community"
              status="complete"
              count={feedback.length}
              icon={<MessageSquare className="w-5 h-5" />}
              primaryAction={{
                label: feedback.some(f=>!f.hasResponse) ? 'Respond to Reviews' : 'View Reviews',
                onClick: onRespondFeedback
              }}
              priority={feedback.filter(f=>!f.hasResponse).length > 0 ? 'high' : 'normal'}
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-yellow-900">{stats.avgRating}</div>
                  <div className="text-xs text-yellow-600">Avg Rating</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-purple-900">{feedback.length}</div>
                  <div className="text-xs text-purple-600">Total Reviews</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-red-900">{feedback.filter(f=>!f.hasResponse).length}</div>
                  <div className="text-xs text-red-600">Unanswered</div>
                </div>
              </div>
            </EnhancedSectionCard>

            <EnhancedSectionCard
              title="Reports & Analytics"
              description="Download summaries & insights"
              status="complete"
              icon={<FileText className="w-5 h-5" />}
              primaryAction={{
                label: 'Generate Reports',
                onClick: onOpenReports
              }}
              secondaryAction={{
                label: 'View Analytics',
                onClick: onOpenReports
              }}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">📄 Parish Profile (PDF)</span>
                    <span className="text-xs text-gray-500">Ready</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">📊 Visitor Analytics</span>
                    <span className="text-xs text-gray-500">Ready</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">📝 Reviews Summary</span>
                    <span className="text-xs text-gray-500">Ready</span>
                  </div>
                </div>
              </div>
            </EnhancedSectionCard>
          </>
        )}
      </div>
    </div>
  );
};