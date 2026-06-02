import { createFileRoute, Link } from "@tanstack/react-router";
import { AppForm, FormTextField } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { loginSchema, type LoginFormValues } from "@/schemas";
import { useAuth } from "@/hooks";
import { useToast } from "@/hooks/use-toast";
import { env } from "@/config/env";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: `Sign in — ${env.VITE_APP_NAME}` }] }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">Access your {env.VITE_APP_NAME} CRM workspace.</p>

      <div className="glass-card mt-8 rounded-2xl p-6">
        <AppForm<LoginFormValues>
          schema={loginSchema}
          defaultValues={{ email: "", password: "" }}
          onSubmit={async (values) => {
            try {
              await login(values);
              toast.success("Signed in successfully");
            } catch (error) {
              toast.fromApiError(error, "Sign in failed");
            }
          }}
          className="space-y-4"
        >
          {() => (
            <>
              <FormTextField<LoginFormValues>
                name="email"
                label="Email"
                type="email"
                placeholder="you@company.com"
              />
              <FormTextField<LoginFormValues>
                name="password"
                label="Password"
                type="password"
                placeholder="••••••••"
              />
              <Button
                type="submit"
                className="w-full rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground"
              >
                Sign in
              </Button>
            </>
          )}
        </AppForm>
      </div>

      <Link to="/" className="mt-6 text-center text-sm text-muted-foreground hover:text-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
