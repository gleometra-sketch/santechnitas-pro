-- DarboRitmas · 0013 · Objekto kortelė: kliento kontaktai ir daugiau failų tipų
-- Kliento duomenis mato administratoriai ir darbuotojai, kuriems paskirtas darbas tame objekte (kaip ir adresą),
-- nes jiems reikia paskambinti klientui.

alter table public.projects
  add column client_name  text check (char_length(client_name) <= 160),
  add column client_phone text check (char_length(client_phone) <= 40),
  add column client_email text check (char_length(client_email) <= 200);

create index attachments_project_idx on public.attachments (project_id, created_at desc);

-- Be nuotraukų ir PDF leidžiami Word / Excel dokumentai (sąmatos, sutartys, brėžiniai).
update storage.buckets
   set allowed_mime_types = array[
     'image/jpeg','image/png','image/webp','image/heic',
     'audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav',
     'application/pdf',
     'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
 where id = 'attachments';
