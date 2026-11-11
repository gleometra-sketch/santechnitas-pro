import { createClient } from "@/lib/supabase/server";

/** Laikini (1 val.) parsisiuntimo adresai privatiems failams. Grąžina tik tuos, kuriuos naudotojas gali matyti. */
export async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("attachments").createSignedUrls(paths, 3600);
  for (const r of data ?? []) if (r.path && r.signedUrl && !r.error) out.set(r.path, r.signedUrl);
  return out;
}
