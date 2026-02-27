import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(email, password, name);
      toast.success('Account created!');
      navigate('/dashboard/overview');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-sm bg-indigo-500 flex items-center justify-center">
            <Mic className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              ForgeVoice
            </h1>
            <p className="text-[10px] text-zinc-500 -mt-0.5">Studio</p>
          </div>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Create your account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs text-zinc-400">Full Name</Label>
                <Input
                  id="name"
                  data-testid="signup-name"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-indigo-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-zinc-400">Email</Label>
                <Input
                  id="email"
                  data-testid="signup-email"
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
                  data-testid="signup-password"
                  type="password"
                  placeholder="Choose a password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-indigo-500/50"
                />
              </div>
              <Button
                type="submit"
                data-testid="signup-submit"
                disabled={loading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
              </Button>
            </form>

            <p className="text-center text-xs text-zinc-500 mt-4">
              Already have an account?{' '}
              <Link to="/login" data-testid="login-link" className="text-indigo-400 hover:text-indigo-300">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
