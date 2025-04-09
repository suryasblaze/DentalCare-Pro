import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; // Import supabase client
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Import Avatar components
// import { Textarea } from '@/components/ui/textarea'; // Removed as working hours are removed
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PageHeader } from '@/components/ui/page-header';
import { Separator } from '@/components/ui/separator'; // Import Separator

// Define a type for the profile data from the 'profiles' table
interface UserProfileData {
  id: string; // Matches the auth user id
  first_name?: string | null; // Allow null from DB
  last_name?: string | null;  // Allow null from DB
  // role and specialization removed as they are not in profiles table
  mobile_number?: string | null;
  address?: string | null;
  date_of_birth?: string | null; // Store as string (YYYY-MM-DD) or Date
  gender?: string | null;
  avatar_url?: string | null; // Add avatar URL field
  // Placeholder fields for display - adjust later based on actual data source
  current_plan?: string | null;
  payment_method_details?: string | null;
}

// Helper array for days - No longer needed as working hours removed
// const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  // Use the updated interface type
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // State for the selected file
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null); // State for image preview

  // Fetch profile data from the database
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error, status } = await supabase
        .from('profiles') // Changed table name to 'profiles'
        // Select the fields from the 'profiles' table, including avatar_url
        .select(`id, first_name, last_name, mobile_number, address, date_of_birth, gender, avatar_url`)
        .eq('id', user.id)
        .single();

      if (error && status !== 406) { // 406 means no row found, which is okay if profile needs creation
        throw error;
      }

      if (data) {
        // TODO: Fetch actual subscription/payment data later
        setProfileData({
          ...data,
          // Ensure new fields are included, even if null from DB
          mobile_number: data.mobile_number || null,
          address: data.address || null,
          date_of_birth: data.date_of_birth || null,
          gender: data.gender || null,
          avatar_url: data.avatar_url || null, // Include avatar_url
          // Add placeholder values for display
          current_plan: "Pro Plan", // Example placeholder
          payment_method_details: "Visa ending in 4242", // Example placeholder
        });
        setAvatarPreview(data.avatar_url || null); // Set initial preview
      } else {
        // Initialize new fields as well
        setProfileData({
          id: user.id,
          first_name: '',
          last_name: '',
          // Removed role and specialization initialization
          mobile_number: null,
          address: null,
          date_of_birth: null,
          gender: null,
          avatar_url: null, // Initialize avatar_url
          // Initialize placeholders
          current_plan: "Free Plan",
          payment_method_details: "N/A",
        });
        setAvatarPreview(null); // Reset preview
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error Fetching Profile',
        description: error.message || 'Could not load profile data.',
        variant: 'destructive',
      });
      // Set empty state on error, include new fields
      setProfileData({
        id: user?.id || '',
        first_name: '',
          last_name: '',
          // Removed role and specialization initialization
          mobile_number: null,
          address: null,
          date_of_birth: null,
          gender: null,
          avatar_url: null, // Initialize avatar_url
          // Initialize placeholders
          current_plan: "Free Plan",
          payment_method_details: "N/A",
        });
        setAvatarPreview(null); // Reset preview
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handler for regular inputs and specific day inputs for working hours
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Handle all fields directly
    setProfileData(prevData => prevData ? { ...prevData, [name]: value } : null);
  };

  // Handler for file input change with size validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxSizeInBytes = 2 * 1024 * 1024; // 2MB

      if (file.size > maxSizeInBytes) {
        toast({
          title: 'File Too Large',
          description: `Please select an image smaller than 2MB.`,
          variant: 'destructive',
        });
        e.target.value = ''; // Clear the file input
        setAvatarFile(null); // Clear the file state
        // Optionally revert preview, or leave it as is until cancel/save
        // setAvatarPreview(profileData?.avatar_url || null);
        return; // Stop processing this file
      }

      setAvatarFile(file);
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // If no file is selected or selection is cancelled
      setAvatarFile(null);
      // Revert preview to the original avatar_url from profileData
      setAvatarPreview(profileData?.avatar_url || null);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData || !user) return;

    setIsSaving(true);
    let avatarUrlToSave = profileData.avatar_url; // Start with the current URL

    try {
      // 1. Handle Avatar Upload if a new file is selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}-${Date.now()}.${fileExt}`; // Unique path

        // Upload to 'avatars' bucket
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            cacheControl: '3600', // Cache for 1 hour
            upsert: true, // Overwrite if file exists (optional, depends on desired behavior)
          });

        if (uploadError) {
          throw new Error(`Failed to upload avatar: ${uploadError.message}`);
        }

        // Get the public URL of the uploaded file
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
            console.warn("Could not get public URL for uploaded avatar, but upload might have succeeded.");
            // Decide how to handle this - maybe save the path instead? For now, we'll proceed without updating the URL if this fails.
            // Or throw an error: throw new Error("Failed to get public URL for avatar.");
        } else {
             avatarUrlToSave = urlData.publicUrl; // Set the URL to save in the profile
        }

      }

      // 2. Prepare the profile data updates, including the avatar URL
      const updates = {
        id: user.id, // Match the user ID
        // Removed email and role as they are not in profiles table
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        // Removed specialization
        mobile_number: profileData.mobile_number,
        address: profileData.address,
        date_of_birth: profileData.date_of_birth,
        gender: profileData.gender,
        avatar_url: avatarUrlToSave, // Include the determined avatar URL
        updated_at: new Date().toISOString(),
      };

      // 3. Use upsert on the 'profiles' table
      const { error } = await supabase
        .from('profiles') // Changed table name to 'profiles'
        .upsert(updates, { onConflict: 'id' }); // 'id' is the primary key and conflict target

      if (error) {
        throw error;
      }

      toast({ title: 'Profile updated successfully!' });
      setAvatarFile(null); // Clear the selected file state after successful save
      // Update profileData state locally with the new URL if it changed
      if (avatarUrlToSave !== profileData.avatar_url) {
        setProfileData(prev => prev ? { ...prev, avatar_url: avatarUrlToSave } : null);
        // Preview should already be updated, but ensure consistency
        setAvatarPreview(avatarUrlToSave ?? null); // Ensure null is passed if undefined
      }
      setIsEditing(false); // Exit editing mode
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      // Don't reset avatar preview on error, let user retry or cancel
      toast({
        title: 'Update Failed',
        description: error.message || 'Could not save profile changes.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Display loading state
  if (isLoading) {
    return <PageHeader heading="Profile" text="Loading profile..." />;
  }

  // Handle case where user is somehow not available after loading
  if (!user || !profileData) {
     return <PageHeader heading="Profile" text="Could not load profile data." />;
  }

  return (
    <div className="container mx-auto py-8">
      {/* Use heading and text props */}
      <PageHeader heading="User Profile" text="View and update your personal information." />

      <Card className="max-w-2xl mx-auto mt-6">
        <CardHeader>
          <CardTitle>Your Details</CardTitle>
        </CardHeader>
        <form onSubmit={handleSaveChanges}>
          <CardContent className="space-y-6"> {/* Increased spacing */}

            {/* Profile Picture Section */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                {/* Show preview if available, otherwise show stored avatar or fallback */}
                <AvatarImage src={avatarPreview || profileData?.avatar_url || undefined} alt="User Avatar" />
                <AvatarFallback>
                  {/* Display initials if available */}
                  {profileData?.first_name?.[0]?.toUpperCase()}
                  {profileData?.last_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <div className="w-full max-w-xs">
                  <Label htmlFor="avatarFile" className="sr-only">Upload Profile Picture</Label>
                  <Input
                    id="avatarFile"
                    name="avatarFile"
                    type="file"
                    accept="image/png, image/jpeg, image/gif" // Accept common image types
                    onChange={handleFileChange}
                    disabled={isSaving}
                    className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                   <p className="text-xs text-muted-foreground mt-1 text-center">Upload a square picture (e.g., 100x100px). Max 2MB (JPG, PNG, GIF).</p> {/* Updated text */}
                </div>
              )}
            </div>

            <Separator /> {/* Add separator */}

            {/* Existing Fields */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              {/* Get email from user object (AuthContext) */}
              <Input id="email" type="email" value={user.email || ''} disabled />
              <p className="text-sm text-muted-foreground">Email address cannot be changed here.</p>
            </div>

            {/* First Name Field */}
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                value={profileData.first_name || ''}
                onChange={handleInputChange}
                disabled={!isEditing || isSaving}
              />
            </div>

            {/* Last Name Field */}
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                value={profileData.last_name || ''}
                onChange={handleInputChange}
                disabled={!isEditing || isSaving}
              />
            </div>

            {/* Specialization Field Removed */}

            {/* Mobile Number Field */}
            <div className="space-y-2">
              <Label htmlFor="mobile_number">Mobile Number</Label>
              <Input
                id="mobile_number"
                name="mobile_number"
                type="tel" // Use tel type for mobile numbers
                value={profileData.mobile_number || ''}
                onChange={handleInputChange}
                disabled={!isEditing || isSaving}
                placeholder="e.g., +1 123 456 7890"
              />
            </div>

            {/* Address Field */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input // Consider using Textarea if address can be long
                id="address"
                name="address"
                value={profileData.address || ''}
                onChange={handleInputChange}
                disabled={!isEditing || isSaving}
                placeholder="e.g., 123 Main St, Anytown, USA"
              />
            </div>

            {/* Date of Birth Field */}
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date" // Use date type
                value={profileData.date_of_birth || ''} // Ensure value is in 'YYYY-MM-DD' format if using type="date"
                onChange={handleInputChange}
                disabled={!isEditing || isSaving}
              />
            </div>

            {/* Gender Field */}
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Input // Consider using Select or RadioGroup for predefined options
                id="gender"
                name="gender"
                value={profileData.gender || ''}
                onChange={handleInputChange}
                disabled={!isEditing || isSaving}
                placeholder="e.g., Male, Female, Non-binary, Prefer not to say"
              />
            </div>

            <Separator />

             {/* Subscription Information (Display Only) */}
             <div className="space-y-2">
               <h3 className="text-lg font-medium">Subscription</h3>
               <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Current Plan:</span>
                 <span>{profileData.current_plan || 'N/A'}</span>
               </div>
               {/* Add more plan details if needed */}
               {/* <Button variant="outline" size="sm" disabled>Manage Subscription</Button> */}
               {/* Add button later when functionality is implemented */}
             </div>

             {/* Payment Method (Display Only) */}
             <div className="space-y-2">
               <h3 className="text-lg font-medium">Payment Method</h3>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Details:</span>
                  <span>{profileData.payment_method_details || 'N/A'}</span>
                </div>
               {/* <Button variant="outline" size="sm" disabled>Update Payment</Button> */}
               {/* Add button later when functionality is implemented */}
             </div>


          </CardContent>
          <CardFooter className="flex justify-end gap-2">
             {/* Only show edit/save for profile details, not subscription yet */}
            {isEditing ? (
              <>
                {/* Disable Cancel button while saving */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setAvatarFile(null); // Clear selected file on cancel
                    setAvatarPreview(profileData?.avatar_url || null); // Reset preview
                    fetchProfile(); // Refetch original data
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                {/* Use isSaving state for the Save button */}
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
