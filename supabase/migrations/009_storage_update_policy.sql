-- profile-photos: 본인 파일 UPDATE(upsert) 허용
CREATE POLICY "profile_photos_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- profile-photos: 본인 파일 DELETE 허용 (재업로드 시 필요)
CREATE POLICY "profile_photos_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
