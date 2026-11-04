// BLI Image Host (img.billlayneinsurance.com) — replaces the old Imgur uploader.
// Optimizes in the browser to the chosen preset before uploading; GIF/SVG pass
// through untouched so animations and vectors survive.

const IMAGE_HOST_BASE = 'https://img.billlayneinsurance.com';
const ACCESS_CODE_STORAGE_KEY = 'bliImgAccessCode';
export const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

export function validateImage(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error('Use JPG, PNG, WEBP, GIF, or SVG only.');
  if (!file.size) throw new Error('This image is empty. Choose another file.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image exceeds the image host limit of 30 MiB.');
}

function checkCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
}

async function hostFetch(url: string, init: RequestInit, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  let timedOut = false;
  if (init.signal?.aborted) controller.abort();
  init.signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    // Consume the body within the timeout, not just the response headers.
    const body = await response.arrayBuffer();
    return new Response([204, 205, 304].includes(response.status) ? null : body, { status: response.status, statusText: response.statusText, headers: response.headers });
  } catch (error) {
    if (timedOut) throw new Error('The image host took too long. Please retry.');
    if (controller.signal.aborted) throw new DOMException('Request cancelled.', 'AbortError');
    throw error;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', cancel);
  }
}

const PASSTHROUGH_TYPES = ['image/gif', 'image/svg+xml'];

export type ImagePresetId = 'gmail' | 'logo' | 'web' | 'original';

export interface ImagePreset {
  id: ImagePresetId;
  label: string;
  hint: string;
  icon: string;
  /** Target mime type; undefined = upload the file untouched. */
  type?: 'image/jpeg' | 'image/png' | 'image/webp';
  maxWidth?: number;
  quality?: number;
}

export const IMAGE_PRESETS: ImagePreset[] = [
  {
    id: 'gmail',
    label: 'Gmail',
    hint: 'JPEG · 1200px — renders in every email client, including old Outlook',
    icon: 'fa-envelope',
    type: 'image/jpeg',
    maxWidth: 1200,
    quality: 0.8,
  },
  {
    id: 'logo',
    label: 'Logo',
    hint: 'PNG — keeps transparency and sharp edges',
    icon: 'fa-shapes',
    type: 'image/png',
  },
  {
    id: 'web',
    label: 'Web',
    hint: 'WebP · 1600px — smallest files for web pages and quotes',
    icon: 'fa-globe',
    type: 'image/webp',
    maxWidth: 1600,
    quality: 0.82,
  },
  {
    id: 'original',
    label: 'GIF / Original',
    hint: 'Uploads the file exactly as-is (use for GIFs and SVGs)',
    icon: 'fa-film',
  },
];

const EXTENSION_FOR_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface ImageHostUpload {
  key: string;
  url: string;
  size: number;
}

export interface ImageHostLibraryItem {
  key: string;
  url: string;
  size: number;
  uploaded: string;
  originalName: string;
  label: string;
  width?: number;
  height?: number;
  contentType?: string;
}

let inventoryCache: { code: string; images: ImageHostLibraryItem[]; loadedAt: number } | null = null;
export const getCachedHostedImages = (): ImageHostLibraryItem[] | null =>
  inventoryCache?.code === getAccessCode() && Date.now() - inventoryCache.loadedAt < 5 * 60 * 1000
    ? inventoryCache.images : null;

interface ImageHostLibraryPage {
  objects?: ImageHostLibraryItem[];
  cursor?: string | null;
  error?: string;
}

export const getAccessCode = (): string => {
  try {
    return window.localStorage.getItem(ACCESS_CODE_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

export const setAccessCode = (code: string): void => {
  try {
    window.localStorage.setItem(ACCESS_CODE_STORAGE_KEY, code.trim());
  } catch {
    throw new Error('The access code could not be saved. Browser storage may be blocked or full. Allow storage or free space, then retry.');
  }
};

export const checkAccessCode = async (code: string, signal?: AbortSignal): Promise<boolean> => {
  const response = await hostFetch(`${IMAGE_HOST_BASE}/api/check`, {
    headers: { 'x-access-code': code.trim() },
    signal,
  });
  return response.ok;
};

interface OptimizedImage {
  blob: Blob;
  name: string;
  type: string;
}

const optimize = async (file: File, preset: ImagePreset, signal?: AbortSignal): Promise<OptimizedImage> => {
  checkCancelled(signal);
  const asOriginal: OptimizedImage = { blob: file, name: file.name, type: file.type };

  // GIF/SVG re-encoding would kill animation/vectors, so they always pass through.
  if (!preset.type || PASSTHROUGH_TYPES.includes(file.type)) {
    return asOriginal;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    checkCancelled(signal);
    return asOriginal;
  }
  if (signal?.aborted) { bitmap.close(); checkCancelled(signal); }

  const maxWidth = preset.maxWidth ?? 0;
  const scale = maxWidth && bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close(); return asOriginal; }
  if (ctx && preset.type === 'image/jpeg') {
    // JPEG has no alpha channel — flatten transparency onto white.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, preset.type, preset.quality)
  );
  checkCancelled(signal);

  // Encoder unavailable, or the re-encode gained nothing at full size — keep the original.
  if (!blob || (scale === 1 && blob.size >= file.size)) {
    return asOriginal;
  }

  return {
    blob,
    name: file.name.replace(/\.[^.]*$/, '') + '.' + EXTENSION_FOR_TYPE[preset.type],
    type: preset.type,
  };
};

export const uploadImage = async (file: File, preset: ImagePreset, signal?: AbortSignal): Promise<ImageHostUpload> => {
  validateImage(file);
  const code = getAccessCode();
  if (!code) {
    throw new Error('Enter the image host access code first.');
  }

  const { blob, name, type } = await optimize(file, preset, signal);
  checkCancelled(signal);
  const response = await hostFetch(
    `${IMAGE_HOST_BASE}/api/upload?filename=${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: { 'x-access-code': code, 'content-type': type },
      body: blob,
      signal,
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403 ? 'Image host access code was rejected.'
        : (data as { error?: string }).error || `Upload failed (HTTP ${response.status}).`
    );
  }
  if (typeof data.url !== 'string' || typeof data.key !== 'string') throw new Error('The upload response did not include an image link. Check the library before retrying.');
  if (inventoryCache?.code === code) {
    inventoryCache.images = [{ ...data, uploaded: new Date().toISOString(), originalName: name, label: '', contentType: type },
      ...inventoryCache.images.filter(image => image.key !== data.key)];
  }
  return data as ImageHostUpload;
};

export const listAllHostedImages = async (options: {
  signal?: AbortSignal;
  forceRefresh?: boolean;
  onProgress?: (count: number, pages: number) => void;
} = {}): Promise<ImageHostLibraryItem[]> => {
  const code = getAccessCode();
  if (!code) {
    throw new Error('Enter the image host access code first.');
  }
  checkCancelled(options.signal);
  const cached = getCachedHostedImages();
  if (cached && !options.forceRefresh) { options.onProgress?.(cached.length, 0); return cached; }

  const images: ImageHostLibraryItem[] = [];
  const seenCursors = new Set<string>();
  let cursor = '';

  for (let page = 0; page < 100; page += 1) {
    const endpoint = cursor
      ? `${IMAGE_HOST_BASE}/api/list?cursor=${encodeURIComponent(cursor)}`
      : `${IMAGE_HOST_BASE}/api/list`;
    checkCancelled(options.signal);
    const response = await hostFetch(endpoint, {
      headers: { 'x-access-code': code },
      signal: options.signal,
    });
    const data = await response.json().catch(() => ({})) as ImageHostLibraryPage;

    if (!response.ok) {
      throw new Error(
        (response.status === 401 || response.status === 403
          ? 'Image host access code was rejected.'
          : data.error || `Could not load the image library (HTTP ${response.status}).`)
      );
    }

    if (!Array.isArray(data.objects)) throw new Error('The image library returned invalid data. Please retry.');
    images.push(...data.objects.filter(image => typeof image.key === 'string' && typeof image.url === 'string'));
    options.onProgress?.(new Set(images.map(image => image.key)).size, page + 1);

    const nextCursor = typeof data.cursor === 'string' ? data.cursor : '';
    if (!nextCursor) break;
    if (seenCursors.has(nextCursor)) {
      throw new Error('The image library returned a repeated page cursor.');
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;

    if (page === 99) {
      throw new Error('The image library is too large to load in one search.');
    }
  }

  checkCancelled(options.signal);
  const result = [...new Map(images.map((image) => [image.key, image])).values()]
    .sort((left, right) =>
      (Date.parse(right.uploaded) || 0) - (Date.parse(left.uploaded) || 0)
    );
  if (getAccessCode() === code) inventoryCache = { code, images: result, loadedAt: Date.now() };
  return result;
};
