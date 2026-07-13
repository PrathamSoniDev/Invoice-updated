import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Mail, Lock, Loader2, Shield, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@gmail.com', password: '12345678' },
  });

  const onSubmit = async (data: FormData) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      toast.success('Welcome back to InvoiceGen!');
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Invalid credentials. Try the demo accounts below.');
    }
  };

  const fillDemo = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Enter your credentials to access your dashboard</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="pl-9"
              {...register('email')}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="pl-9 pr-9"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="remember" defaultChecked />
          <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">Remember me for 30 days</Label>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <div className="mt-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Demo Accounts</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => fillDemo('admin@gmail.com', '12345678')}
            className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Shield className="h-3.5 w-3.5 text-primary" /> Admin
            </div>
            <p className="text-xs text-muted-foreground">admin@gmail.com</p>
            <p className="text-xs text-muted-foreground">Password: 12345678</p>
          </button>
          <button
            onClick={() => fillDemo('user@gmail.com', '12345678')}
            className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <UserIcon className="h-3.5 w-3.5 text-success" /> Business
            </div>
            <p className="text-xs text-muted-foreground">user@gmail.com</p>
            <p className="text-xs text-muted-foreground">Password: 12345678</p>
          </button>
        </div>
      </div>
    </div>
  );
}
