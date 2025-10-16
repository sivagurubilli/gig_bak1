import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { User, Wallet, Calendar, Mail, Shield, ShieldOff, Globe, Heart, MessageCircle } from "lucide-react";
import { User as UserType } from "@shared/schema";

interface UserDetailsModalProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
  onBlockToggle: (user: UserType) => void;
  isActionPending?: boolean;
}

export function UserDetailsModal({ 
  user, 
  isOpen, 
  onClose, 
  onBlockToggle, 
  isActionPending = false 
}: UserDetailsModalProps) {
  if (!user) return null;

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-gray-500">@{user.username}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant={user.isOnline ? 'default' : 'outline'}>
                  {user.isOnline ? 'Online' : 'Offline'}
                </Badge>
                <Badge variant={user.gender === 'male' ? 'default' : 'secondary'}>
                  {user.gender}
                </Badge>
                {user.isBlocked && (
                  <Badge variant="destructive">Blocked</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Language</p>
                    <p className="font-medium">{user.language?.toUpperCase() || 'EN'}</p>
                  </div>
                </div>

                {user.dob && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">
                        {new Date(user.dob).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} 
                        <span className="text-sm text-gray-500 ml-2">
                          (Age: {Math.floor((new Date().getTime() - new Date(user.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))})
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Joined</p>
                    <p className="font-medium">{formatDate(user.createdAt)}</p>
                  </div>
                </div>

                {user.lastActive && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Last Active</p>
                      <p className="font-medium">{formatDate(user.lastActive)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Interests and About Me */}
          {(user.interests && user.interests.length > 0) || user.aboutMe ? (
            <Card>
              <CardHeader>
                <CardTitle>Profile Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.interests && user.interests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-gray-500" />
                      <p className="text-sm font-medium text-gray-500">Interests</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.interests.map((interest, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {user.aboutMe && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="h-4 w-4 text-gray-500" />
                      <p className="text-sm font-medium text-gray-500">About Me</p>
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {user.aboutMe}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Virtual Currency */}
          <Card>
            <CardHeader>
              <CardTitle>Profile & Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant={user.profileType === 'basic' ? 'outline' : 'default'} className="text-lg px-3 py-1">
                    {user.profileType === 'basic' ? 'Basic' : 
                     user.profileType === 'gicon' ? 'GIcon' : 
                     user.profileType === 'gstar' ? 'GStar' : 
                     'GIcon + GStar'}
                  </Badge>
                  <div>
                    <p className="text-sm text-gray-500">Profile Type</p>
                    <p className="text-sm font-medium">Level {user.badgeLevel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">₹</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Virtual Currency</p>
                    <p className="text-xl font-bold text-green-600">View Wallet</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>



          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              variant={user.isBlocked ? "default" : "destructive"}
              onClick={() => onBlockToggle(user)}
              disabled={isActionPending}
              className="flex items-center gap-2"
            >
              {user.isBlocked ? (
                <>
                  <ShieldOff className="h-4 w-4" />
                  Unblock User
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Block User
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}