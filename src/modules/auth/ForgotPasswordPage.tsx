import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-success/10 text-success mb-6">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          We have sent a password reset link to your email address. The link will expire in 30 minutes.
        </p>
        <Button onClick={() => navigate('/login')} className="mt-6 w-full">
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to login
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
      <p className="text-sm text-muted-foreground mt-1.5 mb-6">
        No worries, we will send you reset instructions.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" placeholder="you@company.com" className="pl-9" {...register('email')} />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Send Reset Link
        </Button>
      </form>
    </div>
  );
}
