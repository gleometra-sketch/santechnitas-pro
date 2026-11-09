import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { CreateCompanyForm } from "@/components/auth/Forms";
import { requireContext } from "@/lib/auth/context";
import { signOut } from "@/lib/auth/actions";

export default async function CreateCompanyPage() {
  const ctx = await requireContext();
  if (ctx.company) redirect("/darbai");
  return (
    <AuthShell
      title="Sukurkite įmonę"
      subtitle="Būsite įmonės savininkas ir administratorius. Darbuotojus pakviesite vėliau. Jei jus pakvietė kolega, naudokite tą patį el. paštą, į kurį gavote kvietimą, ir patvirtinkite jį."
    >
      <CreateCompanyForm />
      <form action={signOut} className="mt-4 text-center">
        <button className="font-semibold text-accent-dark underline underline-offset-2">Atsijungti</button>
      </form>
    </AuthShell>
  );
}
