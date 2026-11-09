-- SANTECHNITAS PRO · 0005 · Failų saugykla (nuotraukos, balso įrašai, PDF)
-- Failų keliai: <company_id>/<failo_vardas>. Skaityti galima tik tada, kai matoma atitinkama attachments eilutė.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 26214400,
        array['image/jpeg','image/png','image/webp','image/heic','audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create function public.storage_company_id(object_name text) returns uuid
language sql immutable as $$
  select case when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then split_part(object_name, '/', 1)::uuid end
$$;
revoke execute on function public.storage_company_id(text) from public, anon;
grant  execute on function public.storage_company_id(text) to authenticated;

create policy attachments_read on storage.objects for select to authenticated
  using (bucket_id = 'attachments'
         and exists (select 1 from public.attachments a where a.storage_path = storage.objects.name));
create policy attachments_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments'
              and public.is_company_member(public.storage_company_id(name))
              and public.company_has_access(public.storage_company_id(name)));
create policy attachments_remove on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and public.is_company_admin(public.storage_company_id(name)));
