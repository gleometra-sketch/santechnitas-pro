import AuthShell from "@/components/auth/AuthShell";
import { NewPasswordForm } from "@/components/auth/Forms";
import { requireContext } from "@/lib/auth/context";

export default async function NewPasswordPage() {
  await requireContext();
  return (
    <AuthShell title="Naujas slaptažodis">
      <NewPasswordForm />
    </AuthShell>
  );
}
