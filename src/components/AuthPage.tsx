
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, Factory, User, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

import { useLogin } from '@/hooks/useLogin';

const AuthPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { mutateAsync: login, isPending: isLoggingIn } = useLogin();
  const { signUp } = useAuth();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await login({ email, password });
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to sign in",
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    try {
      await signUp(email, password, fullName);
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create account",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full py-10 flex items-center justify-center relative overflow-hidden bg-slate-950 font-sans selection:bg-blue-500/30">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[100px] animate-pulse delay-700" />
        <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-6  duration-500 slide-in-from-bottom-4">
        {/* Brand/Logo Area */}
        <div className="mb-8 text-center">
          {/* <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6 transform rotate-3 hover:rotate-6 transition-transform duration-300"> */}
          {/* <Factory className="w-8 h-8 text-white" /> */}
          <img src="/lovable-uploads/1a80eea5-dc8d-4381-8ecd-105c4cd7f9ab.png" alt="Logo" className="max-w-[130px] mx-auto mb-3 text-white" />
          {/* </div> */}
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Factory<span className="text-blue-700">Dashboard</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Next-generation production monitoring system
          </p>
        </div>

        <Card className="border-0 bg-white/5 backdrop-blur-xl shadow-2xl ring-1 ring-white/10">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-white font-semibold tracking-wide">
              Welcome
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enter your credentials to access your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-1 bg-slate-900/50 p-1 rounded-xl mb-6">
                <TabsTrigger
                  value="signin"
                  className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 hover:text-white transition-all duration-300"
                >
                  Sign In
                </TabsTrigger>
                {/* <TabsTrigger
                  value="signup"
                  className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 hover:text-white transition-all duration-300"
                >
                  Sign Up
                </TabsTrigger> */}
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">Email Address</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="name@company.com"
                        className="pl-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-200">Password</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300 h-11"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium h-11 shadow-lg shadow-blue-600/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>Sign In</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-0 animate-in fade-in slide-in-from-right-2 duration-300">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-slate-200">Full Name</Label>
                    <div className="relative group">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        placeholder="John Doe"
                        className="pl-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-slate-200">Email Address</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="name@company.com"
                        className="pl-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-slate-200">Password</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        placeholder="Create a strong password"
                        className="pl-10 bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300 h-11"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium h-11 shadow-lg shadow-blue-600/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Creating account...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>Get Started</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>© 2024 Factory Dashboard. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
