import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Chrome, Facebook, User, Mail, Lock, BrainCircuit } from 'lucide-react'; // Added Mail icon, using BrainCircuit

// Placeholder image - replace with your preferred tech/AI graphic or the woman image
const featureImageUrl = 'https://i.postimg.cc/cL6vs7qQ/login-1.png'; // Using the woman image from the second example

const SignUpPage: React.FC = () => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      setError('You must agree to the Terms & Privacy policy.');
      return;
    }
    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name, // Pass the name here
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      toast({
        title: 'Account Created!',
        description: data.user?.identities?.length === 0
          ? 'Please check your email to confirm your account.'
          : 'You can now log in.',
        variant: 'default',
      });
      // Clear form on success
      setName('');
      setEmail('');
      setPassword('');
      setAgreedToTerms(false);

    } catch (err: any) {
      console.error('Sign up failed:', err);
      setError(err.message || 'Failed to create account. Please try again.');
      toast({
        title: 'Sign Up Error',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // TODO: Implement social login handlers
  const handleGoogleLogin = () => console.log('Google login clicked');
  const handleFacebookLogin = () => console.log('Facebook login clicked');

  return (
    // Elegant gradient background using the specified colors, darker feel
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-bl from-brand-dark via-brand-medium to-brand-light p-4">
      {/* Centered Card with refined styling */}
      <div className="w-full max-w-4xl bg-white/90 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-white/10 backdrop-blur-sm">

        {/* Left Side: Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-center text-brand-dark mb-2 tracking-tight">SIGN UP</h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            Create your account to unlock AI features.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div className="relative group">
              <Label htmlFor="name" className="sr-only">Full Name</Label>
              <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-medium transition-colors duration-200" />
              <Input
                id="name"
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                // Elegant input style
                className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-transparent bg-brand-very-light/20 text-sm shadow-inner transition-colors duration-200"
              />
            </div>
            {/* Email Field */}
            <div className="relative group">
              <Label htmlFor="email" className="sr-only">Email</Label>
              <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-medium transition-colors duration-200" />
              <Input
                id="email"
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                // Elegant input style
                className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-transparent bg-brand-very-light/20 text-sm shadow-inner transition-colors duration-200"
              />
            </div>
            {/* Password Field */}
            <div className="relative group">
              <Label htmlFor="password" className="sr-only">Password</Label>
              <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-medium transition-colors duration-200" />
              <Input
                id="password"
                type="password"
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                // Elegant input style
                className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-transparent bg-brand-very-light/20 text-sm shadow-inner transition-colors duration-200"
              />
            </div>

            {/* Terms Agreement */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                // Elegant checkbox style
                className="border-gray-300 data-[state=checked]:bg-brand-dark data-[state=checked]:border-brand-dark data-[state=checked]:text-white focus:ring-brand-light focus:ring-offset-white"
              />
              <label
                htmlFor="terms"
                className="text-xs font-medium text-gray-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-medium hover:text-brand-dark hover:underline">Terms</a> & <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-medium hover:text-brand-dark hover:underline">Privacy Policy</a>
              </label>
            </div>

            {error && <p className="text-sm text-red-600 text-center pt-1">{error}</p>}

            <Button
              type="submit"
              // Elegant gradient button
              className="w-full bg-gradient-to-r from-brand-medium to-brand-dark hover:shadow-lg hover:opacity-95 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out disabled:opacity-70"
              disabled={isLoading || !agreedToTerms}
            >
              {isLoading ? 'Creating Account...' : 'Sign Up Now'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-4">Or sign up with</p>
             <div className="flex justify-center gap-4">
              {/* Elegant outlined social buttons */}
              <Button variant="outline" onClick={handleGoogleLogin} className="flex items-center justify-center gap-2 border-gray-300 hover:border-brand-light hover:bg-brand-very-light/20 rounded-lg px-6 py-2 text-sm text-gray-700 transition-colors duration-200 shadow-sm">
                <Chrome className="h-4 w-4" /> Google
              </Button>
              <Button variant="outline" onClick={handleFacebookLogin} className="flex items-center justify-center gap-2 border-gray-300 hover:border-brand-light hover:bg-brand-very-light/20 rounded-lg px-6 py-2 text-sm text-gray-700 transition-colors duration-200 shadow-sm">
                <Facebook className="h-4 w-4" /> Facebook
              </Button>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-medium hover:text-brand-dark hover:underline">
              Log In
            </Link>
          </p>
        </div>

        {/* Right Side: Image (Same as Login) */}
        <div className="hidden md:flex items-center justify-center p-8 bg-gradient-to-br from-brand-light via-brand-medium to-brand-dark relative overflow-hidden rounded-r-2xl">
           {/* Enhanced glassmorphism container */}
           <div className="relative w-full max-w-sm aspect-[3/4] bg-white/10 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 p-4 flex items-center justify-center">
             <img
               src={featureImageUrl}
               alt="AI Tech Feature"
               className="max-w-full max-h-full object-contain rounded-lg opacity-95"
             />
             {/* AI Icon */}
             <BrainCircuit className="absolute top-4 right-4 h-8 w-8 text-white/60 opacity-70" />
           </div>
           {/* Abstract background shapes for AI tech feel */}
           <div className="absolute -bottom-1/4 -left-1/4 w-2/3 h-2/3 bg-brand-very-light/5 rounded-full blur-3xl opacity-50 animate-pulse"></div>
           <div className="absolute -top-1/4 -right-1/3 w-1/2 h-1/2 bg-white/5 rounded-full blur-3xl opacity-40 animate-pulse animation-delay-2000"></div>
        </div>

      </div>
    </div>
  );
};

export default SignUpPage;
