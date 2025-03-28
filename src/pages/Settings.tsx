import React, { useState, useEffect } from 'react';
import { User, Building, Bell, Shield, Clock, Users, Plus, Trash2, Mail, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

export function Settings() {
  const [settings, setSettings] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewStaffDialog, setShowNewStaffDialog] = useState(false);
  const [newStaff, setNewStaff] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'doctor',
    specialization: '',
    working_hours: JSON.stringify([
      { day: 'monday', start: '09:00', end: '17:00' },
      { day: 'tuesday', start: '09:00', end: '17:00' },
      { day: 'wednesday', start: '09:00', end: '17:00' },
      { day: 'thursday', start: '09:00', end: '17:00' },
      { day: 'friday', start: '09:00', end: '17:00' }
    ])
  });

  useEffect(() => {
    Promise.all([
      fetchSettings(),
      fetchStaff()
    ]);
  }, []);

  const fetchStaff = async () => {
    try {
      const data = await api.staff.getAll();
      setStaff(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await api.settings.get();
      setSettings(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    // Show saving toast
    toast({
      title: "Saving changes...",
      description: "Please wait while we update your settings.",
    });

    setSaving(true);
    try {
      await api.settings.update(settings);
      toast({
        title: "Settings saved successfully",
        description: "All your changes have been updated.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateWorkingHours = (day: string, field: 'start' | 'end' | 'is_open', value: string | boolean) => {
    if (!settings) return;

    const workingHours = [...settings.working_hours];
    const dayIndex = workingHours.findIndex(h => h.day === day);
    if (dayIndex !== -1) {
      workingHours[dayIndex] = {
        ...workingHours[dayIndex],
        [field]: value
      };
      setSettings({
        ...settings,
        working_hours: workingHours
      });
    }
  };

  const handleCreateStaff = async () => {
    try {
      await api.staff.create(newStaff);
      setShowNewStaffDialog(false);
      fetchStaff();
      setNewStaff({
        first_name: '',
        last_name: '',
        email: '',
        role: 'doctor',
        specialization: '',
        working_hours: JSON.stringify([
          { day: 'monday', start: '09:00', end: '17:00' },
          { day: 'tuesday', start: '09:00', end: '17:00' },
          { day: 'wednesday', start: '09:00', end: '17:00' },
          { day: 'thursday', start: '09:00', end: '17:00' },
          { day: 'friday', start: '09:00', end: '17:00' }
        ])
      });
      toast({
        title: "Staff member created",
        description: "New staff member has been added successfully.",
      });
    } catch (error) {
      console.error('Error creating staff:', error);
      toast({
        title: "Error",
        description: "Failed to create staff member. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  if (!settings) {
    return <div>No settings found</div>;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Clinic Information */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">Clinic Information</h2>
                <p className="mt-1 text-sm text-gray-500">Manage your clinic details and contact information</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Clinic Name</Label>
                <Input
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={settings.website}
                  onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">Working Hours</h2>
                <p className="mt-1 text-sm text-gray-500">Set your clinic's operating hours</p>
              </div>
            </div>
            <div className="mt-6">
              <div className="space-y-4">
                {settings.working_hours.map((hours: any) => (
                  <div key={hours.day} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={hours.is_open}
                        onCheckedChange={(checked) => updateWorkingHours(hours.day, 'is_open', checked)}
                      />
                      <span className="text-sm font-medium capitalize">{hours.day}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={hours.start}
                        onChange={(e) => updateWorkingHours(hours.day, 'start', e.target.value)}
                        disabled={!hours.is_open}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={hours.end}
                        onChange={(e) => updateWorkingHours(hours.day, 'end', e.target.value)}
                        disabled={!hours.is_open}
                        className="w-32"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Bell className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
                <p className="mt-1 text-sm text-gray-500">Configure your notification settings</p>
              </div>
            </div>
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  checked={settings.notification_preferences.email_notifications}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    notification_preferences: {
                      ...settings.notification_preferences,
                      email_notifications: checked
                    }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                </div>
                <Switch
                  checked={settings.notification_preferences.sms_notifications}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    notification_preferences: {
                      ...settings.notification_preferences,
                      sms_notifications: checked
                    }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Appointment Reminders</Label>
                  <p className="text-sm text-muted-foreground">Send reminders for upcoming appointments</p>
                </div>
                <Switch
                  checked={settings.notification_preferences.appointment_reminders}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    notification_preferences: {
                      ...settings.notification_preferences,
                      appointment_reminders: checked
                    }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reminder Time</Label>
                <Select
                  value={settings.notification_preferences.reminder_time}
                  onValueChange={(value) => setSettings({
                    ...settings,
                    notification_preferences: {
                      ...settings.notification_preferences,
                      reminder_time: value
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 hour before</SelectItem>
                    <SelectItem value="2h">2 hours before</SelectItem>
                    <SelectItem value="24h">24 hours before</SelectItem>
                    <SelectItem value="48h">48 hours before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Management */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">Staff Management</h2>
                  <p className="mt-1 text-sm text-gray-500">Manage clinic staff and their roles</p>
                </div>
              </div>
              <Button onClick={() => setShowNewStaffDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Staff Member
              </Button>
            </div>
            <div className="mt-6 space-y-4">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {member.first_name} {member.last_name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span className="capitalize">{member.role}</span>
                        {member.specialization && (
                          <span>• {member.specialization}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      {member.email}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to remove this staff member?')) {
                          // Handle staff removal
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your security preferences and access controls
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Button className="w-full">
                Change Password
              </Button>
              <div className="mt-4">
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="2fa"
                      name="2fa"
                      type="checkbox"
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="2fa" className="font-medium text-gray-700">
                      Enable Two-Factor Authentication
                    </label>
                    <p className="text-gray-500">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Dialog open={showNewStaffDialog} onOpenChange={setShowNewStaffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={newStaff.first_name}
                  onChange={(e) => setNewStaff({ ...newStaff, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={newStaff.last_name}
                  onChange={(e) => setNewStaff({ ...newStaff, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={newStaff.role}
                onValueChange={(value) => setNewStaff({ ...newStaff, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="assistant">Assistant</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newStaff.role === 'doctor' && (
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input
                  value={newStaff.specialization}
                  onChange={(e) => setNewStaff({ ...newStaff, specialization: e.target.value })}
                  placeholder="e.g., Orthodontics, Periodontics"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewStaffDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateStaff}>
              Add Staff Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}