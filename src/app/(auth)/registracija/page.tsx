import AuthShell from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/Forms";

export default function RegisterPage() {
  return (
    <AuthShell title="Registracija" subtitle="Išbandykite 14 dienų nemokamai, su pilna prieiga.">
      <RegisterForm />
    </AuthShell>
  );
}
