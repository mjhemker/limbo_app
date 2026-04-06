import { supabase } from '../../lib/supabase';
import * as FileSystem from 'expo-file-system';

export interface FileUpload {
  uri: string;
  type?: string;
  name?: string;
}

// Helper to get file extension from URI or mime type
function getFileExtension(uri: string, mimeType?: string): string {
  // Try to get extension from URI
  const uriExt = uri.split('.').pop()?.split('?')[0];
  if (uriExt && uriExt.length <= 4) {
    return uriExt;
  }

  // Fall back to mime type
  if (mimeType) {
    const parts = mimeType.split('/');
    return parts[1] || 'bin';
  }

  return 'bin';
}

// Convert URI to Blob for upload
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}

export const storageService = {
  async uploadResponseMedia(
    file: FileUpload,
    userId: string,
    responseId: string
  ): Promise<string | null> {
    if (!file || !file.uri) return null;

    const ext = getFileExtension(file.uri, file.type);
    const path = `${userId}/${responseId}.${ext}`;
    const bucket =
      file.type?.startsWith('audio/') ? 'response-audio' : 'response-media';

    console.log('Uploading to storage:', {
      bucket,
      path,
      fileType: file.type,
      uri: file.uri,
    });

    try {
      const blob = await uriToBlob(file.uri);

      const { data: uploadData, error } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });

      if (error) {
        console.error('Storage upload error:', error);
        console.error('Upload details:', { bucket, path, fileType: file.type });
        throw error;
      }

      console.log('Upload successful:', uploadData);

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);

      console.log('Public URL:', data.publicUrl);

      return data.publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  },

  async uploadAvatar(
    file: FileUpload,
    userId: string
  ): Promise<string | null> {
    if (!file || !file.uri) return null;

    const ext = getFileExtension(file.uri, file.type);
    const path = `${userId}.${ext}`;

    const blob = await uriToBlob(file.uri);

    const { error } = await supabase.storage.from('avatars').upload(path, blob, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

    if (error) {
      console.error('Avatar upload error:', error);
      throw error;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);

    return data.publicUrl;
  },

  async uploadCircleAvatar(
    file: FileUpload,
    circleId: string
  ): Promise<string | null> {
    if (!file || !file.uri) return null;

    const ext = getFileExtension(file.uri, file.type);
    const timestamp = Date.now();
    const path = `circle-${circleId}-${timestamp}.${ext}`;

    const blob = await uriToBlob(file.uri);

    const { error } = await supabase.storage.from('avatars').upload(path, blob, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

    if (error) {
      console.error('Circle avatar upload error:', error);
      throw error;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);

    return data.publicUrl;
  },

  async uploadMessageMedia(
    file: FileUpload,
    userId: string
  ): Promise<string | null> {
    if (!file || !file.uri) return null;

    const ext = getFileExtension(file.uri, file.type);
    const timestamp = Date.now();
    const path = `${userId}/${timestamp}.${ext}`;
    const bucket =
      file.type?.startsWith('audio/') ? 'message-audio' : 'message-media';

    const blob = await uriToBlob(file.uri);

    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

    if (error) {
      console.error('Message media upload error:', error);
      throw error;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadCircleMedia(
    file: FileUpload,
    userId: string
  ): Promise<string | null> {
    if (!file || !file.uri) return null;

    const ext = getFileExtension(file.uri, file.type);
    const timestamp = Date.now();
    const path = `${userId}/${timestamp}.${ext}`;
    const bucket =
      file.type?.startsWith('audio/') ? 'response-audio' : 'response-media';

    const blob = await uriToBlob(file.uri);

    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

    if (error) {
      console.error('Circle media upload error:', error);
      throw error;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async deleteFile(url: string, bucket: string): Promise<void> {
    const path = url.split('/').slice(-2).join('/');
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Storage delete error:', error);
      throw error;
    }
  },
};
