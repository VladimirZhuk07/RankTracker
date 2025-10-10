import { LoginForm } from '@/components/admin/LoginForm';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
            <Logo />
            <h1 className="mt-4 text-2xl font-bold font-headline">Admin Login</h1>
            <p className="text-muted-foreground">Access your dashboard</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
