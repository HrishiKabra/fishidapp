insert into storage.buckets (id, name, public)
values ('fish-photos', 'fish-photos', false);

create policy "fish_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'fish-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "fish_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'fish-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "fish_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'fish-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
