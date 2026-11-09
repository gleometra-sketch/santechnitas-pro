import AuthShell from "@/components/auth/AuthShell";
import { ResetRequestForm } from "@/components/auth/Forms";

export default function ResetPage() {
  return (
    <AuthShell title="Slaptažodžio atkūrimas" subtitle="Atsiųsime nuorodą naujam slaptažodžiui nustatyti.">
      <ResetRequestForm />
    </AuthShell>
  );
}
