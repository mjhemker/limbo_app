import { FileUpload } from '../services/supabase/storage';
import * as FileSystem from 'expo-file-system';

// File size limits
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

// Supported file types
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-m4v'];
const SUPPORTED_AUDIO_TYPES = ['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/wav'];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  fileSize?: number;
  fileSizeFormatted?: string;
}

/**
 * Format bytes to human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file size from URI
 */
async function getFileSize(uri: string): Promise<number> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if ('size' in fileInfo) {
      return fileInfo.size || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
}

/**
 * Validate image file
 */
export async function validateImageFile(file: FileUpload): Promise<ValidationResult> {
  // Check file type
  if (file.type && !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported image format. Please use JPG, PNG, GIF, or WebP.',
    };
  }

  // Check file size
  const fileSize = await getFileSize(file.uri);
  if (fileSize > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `Image is too large (${formatFileSize(fileSize)}). Maximum size is ${formatFileSize(MAX_IMAGE_SIZE)}.`,
      fileSize,
      fileSizeFormatted: formatFileSize(fileSize),
    };
  }

  return {
    valid: true,
    fileSize,
    fileSizeFormatted: formatFileSize(fileSize),
  };
}

/**
 * Validate video file
 */
export async function validateVideoFile(file: FileUpload): Promise<ValidationResult> {
  // Check file type
  if (file.type && !SUPPORTED_VIDEO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported video format. Please use MP4 or MOV.',
    };
  }

  // Check file size
  const fileSize = await getFileSize(file.uri);
  if (fileSize > MAX_VIDEO_SIZE) {
    return {
      valid: false,
      error: `Video is too large (${formatFileSize(fileSize)}). Maximum size is ${formatFileSize(MAX_VIDEO_SIZE)}.`,
      fileSize,
      fileSizeFormatted: formatFileSize(fileSize),
    };
  }

  return {
    valid: true,
    fileSize,
    fileSizeFormatted: formatFileSize(fileSize),
  };
}

/**
 * Validate audio file
 */
export async function validateAudioFile(file: FileUpload): Promise<ValidationResult> {
  // Check file type
  if (file.type && !SUPPORTED_AUDIO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported audio format. Please use M4A, MP3, or WAV.',
    };
  }

  // Check file size
  const fileSize = await getFileSize(file.uri);
  if (fileSize > MAX_AUDIO_SIZE) {
    return {
      valid: false,
      error: `Audio is too large (${formatFileSize(fileSize)}). Maximum size is ${formatFileSize(MAX_AUDIO_SIZE)}.`,
      fileSize,
      fileSizeFormatted: formatFileSize(fileSize),
    };
  }

  return {
    valid: true,
    fileSize,
    fileSizeFormatted: formatFileSize(fileSize),
  };
}

/**
 * Validate media file (automatically determines type)
 */
export async function validateMediaFile(file: FileUpload): Promise<ValidationResult> {
  if (!file.type) {
    return {
      valid: false,
      error: 'Unknown file type.',
    };
  }

  if (file.type.startsWith('image/')) {
    return validateImageFile(file);
  } else if (file.type.startsWith('video/')) {
    return validateVideoFile(file);
  } else if (file.type.startsWith('audio/')) {
    return validateAudioFile(file);
  } else {
    return {
      valid: false,
      error: 'Unsupported file type.',
    };
  }
}
