import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Chrome, Facebook, User, Lock, BrainCircuit } from 'lucide-react'; // Using BrainCircuit for AI feel

// Placeholder image - replace with your preferred tech/AI graphic or the woman image
const featureImageUrl = 'https://i.postimg.cc/cL6vs7qQ/login-1.png'; // Using the woman image from the second example

const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Failed to log in. Please check your credentials.');
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
      <div className="w-full max-w-4xl bg-white/95 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-white/10 backdrop-blur-sm">

        {/* Left Side: Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-center text-brand-dark mb-2 tracking-tight">LOGIN</h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            Access your AI-powered dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <Label htmlFor="email" className="sr-only">Email / Username</Label>
              <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-medium transition-colors duration-200" />
              <Input
                id="email"
                type="email"
                placeholder="Email or Username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                // Refined input style: Cleaner background
                className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-transparent bg-gray-50 text-sm shadow-inner transition-colors duration-200"
              />
            </div>
            <div className="relative group">
              <Label htmlFor="password" className="sr-only">Password</Label>
              <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-medium transition-colors duration-200" />
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                // Refined input style: Cleaner background
                className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-transparent bg-gray-50 text-sm shadow-inner transition-colors duration-200"
              />
              {/* TODO: Add forgot password link */}
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <Button
              type="submit"
              // Refined gradient button with subtle hover
              className="w-full bg-gradient-to-r from-brand-medium to-brand-dark hover:from-brand-medium/90 hover:to-brand-dark/90 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out disabled:opacity-70"
              disabled={isLoading}
            >
              {isLoading ? 'Authenticating...' : 'Login Now'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-4">Or login with</p>
            <div className="flex justify-center gap-4">
              {/* Refined outlined social buttons */}
              <Button variant="outline" onClick={handleGoogleLogin} className="flex items-center justify-center gap-2 border-gray-300 hover:border-brand-light hover:bg-gray-100 rounded-lg px-6 py-2 text-sm text-gray-700 transition-colors duration-200 shadow-sm">
                <Chrome className="h-4 w-4" /> Google
              </Button>
              <Button variant="outline" onClick={handleFacebookLogin} className="flex items-center justify-center gap-2 border-gray-300 hover:border-brand-light hover:bg-gray-100 rounded-lg px-6 py-2 text-sm text-gray-700 transition-colors duration-200 shadow-sm">
                <Facebook className="h-4 w-4" /> Facebook
              </Button>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-600">
            Need an account?{' '}
            <Link to="/signup" className="font-semibold text-brand-medium hover:text-brand-dark hover:underline">
              Sign up Free
            </Link>
          </p>
        </div>

        {/* Right Side: Image Panel (Internal to Card) */}
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

export default LoginPage;
