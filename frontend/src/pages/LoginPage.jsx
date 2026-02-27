import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard/overview');
    } catch (err) {
      if (!err.response) {
        // Network error or CORS — no response from server
        toast.error('Cannot reach server. Check your connection or contact support.');
        console.error('Login network error:', err.message, 'API URL:', `${process.env.REACT_APP_BACKEND_URL}/api/auth/login`);
      } else {
        toast.error(err.response?.data?.detail || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-sm bg-indigo-500 flex items-center justify-center">
            <Mic className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1
              className="text-xl font-bold tracking-tight text-white"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              ForgeVoice
            </h1>
            <p className="text-[10px] text-zinc-500 -mt-0.5">Studio</p>
          </div>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle
              className="text-lg text-center text-white"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Sign in to your account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-zinc-400">Email</Label>
                <Input
                  id="email"
                  data-testid="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-indigo-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-zinc-400">Password</Label>
                <Input
                  id="password"
                  data-testid="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-indigo-500/50"
                />
              </div>
              <Button
                type="submit"
                data-testid="login-submit"
                disabled={loading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
              </Button>
            </form>

            <p className="text-center text-xs text-zinc-500 mt-4">
              Don't have an account?{' '}
              <Link to="/signup" data-testid="signup-link" className="text-indigo-400 hover:text-indigo-300">
                Sign up
              </Link>
            </p>

            {/* Demo credentials */}
            <div className="mt-4 p-3 rounded-sm bg-zinc-950 border border-zinc-800">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Demo Accounts</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Admin:</span>
                  <span className="font-mono text-zinc-300">admin@forgevoice.com / admin123</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Client:</span>
                  <span className="font-mono text-zinc-300">alex@company.com / client123</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
