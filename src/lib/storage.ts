import { supabase } from './supabase';

export async function uploadCoverArt(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('cover-art').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('cover-art').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadNotePhoto(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('note-photos').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('note-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadNoteAudio(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'mp3';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('note-audio').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('note-audio').getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteStorageObject(bucket: string, url: string): Promise<void> {
  const path = url.split(`/${bucket}/`)[1];
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}
