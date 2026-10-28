'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Music, 
  Image as ImageIcon, 
  Upload, 
  Check, 
  Copy, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  User, 
  LogOut, 
  ExternalLink, 
  FileAudio, 
  Play, 
  Pause,
  Download,
  Code2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  Sliders,
  Volume2,
  Gauge,
  Lock,
  ArrowRight
} from 'lucide-react';
import { DiscordUser } from './DiscordAuthModal';

interface RobloxSession {
  apiKey: string;
  userId: string;
  name: string;
  displayName: string;
  avatarUrl: string;
}

interface UploadQueueItem {
  id: string;
  file: File;
  processedFile?: File;
  name: string;
  size: string;
  type: 'Audio' | 'Decal';
  previewUrl: string;
  status: 'pending' | 'processing' | 'uploading' | 'success' | 'error';
  assetId?: string;
  operationId?: string;
  moderationState?: string;
  errorMessage?: string;
  speed: number;
  pitch: number;
  volume: number;
}

interface DevToolsSectionProps {
  discordUser: DiscordUser | null;
  onOpenDiscordAuth: () => void;
}

const MAX_UPLOAD_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_PROCESSED_AUDIO_BYTES = 3_900_000;

// Convert AudioBuffer to 16-bit PCM WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  const sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) { out.setUint16(pos, data, true); pos += 2; }
  function setUint32(data: number) { out.setUint32(pos, data, true); pos += 4; }

  // RIFF header
  out.setUint32(0, 0x46464952, true); // "RIFF"
  out.setUint32(4, length - 8, true);
  out.setUint32(8, 0x45564157, true); // "WAVE"
  out.setUint32(12, 0x20746d66, true); // "fmt "
  out.setUint32(16, 16, true);
  setUint16(1); // PCM format
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  out.setUint32(36, 0x61746164, true); // "data"
  out.setUint32(40, length - 44, true);
  pos = 44;

  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}

// Process audio with Speed & Volume using OfflineAudioContext
async function processAudioFile(
  file: File,
  speed: number,
  volume: number,
  forceCompress = false
): Promise<File> {
  if (speed === 1.0 && volume === 100 && !forceCompress) return file;

  let audioCtx: AudioContext | null = null;
  try {
    const arrayBuffer = await file.arrayBuffer();
    audioCtx = new AudioContext();
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    async function renderAudio(sampleRate: number): Promise<Blob> {
      const targetLength = Math.max(1, Math.floor((decodedBuffer.duration / speed) * sampleRate));
      const offlineCtx = new OfflineAudioContext(1, targetLength, sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = decodedBuffer;
      source.playbackRate.value = speed;

      const gainNode = offlineCtx.createGain();
      gainNode.gain.value = volume / 100;
      source.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      source.start(0);
      return audioBufferToWav(await offlineCtx.startRendering());
    }

    let wavBlob = await renderAudio(16_000);
    if (wavBlob.size > MAX_PROCESSED_AUDIO_BYTES) {
      wavBlob = await renderAudio(8_000);
    }
    if (wavBlob.size > MAX_PROCESSED_AUDIO_BYTES) {
      throw new Error('Audio hasil proses masih terlalu besar. Potong durasi audio atau naikkan Speed sebelum upload.');
    }

    const newFileName = `${file.name.replace(/\.[^/.]+$/, '')}_speed_${speed}x.wav`;
    return new File([wavBlob], newFileName, { type: 'audio/wav' });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Audio hasil proses')) throw e;
    console.error('Audio processing failed:', e);
    throw new Error('Audio gagal diproses di browser. Coba format MP3/WAV lain atau upload file aslinya dengan Speed 1x.');
  } finally {
    await audioCtx?.close();
  }
}

async function readUploadResponse(response: Response): Promise<{
  success?: boolean;
  assetId?: string;
  operationId?: string;
  moderationState?: string;
  done?: boolean;
  error?: string;
}> {
  const responseText = await response.text();
  try {
    return JSON.parse(responseText) as {
      success?: boolean;
      assetId?: string;
      operationId?: string;
      moderationState?: string;
      done?: boolean;
      error?: string;
    };
  } catch {
    if (response.status === 413 || /request entity too large/i.test(responseText)) {
      throw new Error('Ukuran upload melewati batas server. Audio diproses otomatis; coba potong durasi atau naikkan Speed.');
    }
    throw new Error(responseText.trim().slice(0, 250) || `Server mengembalikan respons tidak valid (HTTP ${response.status}).`);
  }
}

async function waitForRobloxOperation(
  operationId: string,
  apiKey: string,
  onPending: () => void
): Promise<{ assetId?: string; moderationState?: string; error?: string; done?: boolean }> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await fetch('/api/roblox/upload/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationId, apiKey }),
      cache: 'no-store',
    });
    const result = await readUploadResponse(response);

    if (!response.ok || !result.success) {
      return {
        error: result.error || `Gagal memeriksa status upload (HTTP ${response.status}).`,
        done: result.done,
      };
    }
    if (result.assetId) {
      return { assetId: result.assetId, moderationState: result.moderationState };
    }

    onPending();
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  return { error: 'Roblox masih memproses upload. Tekan Upload lagi untuk memeriksa status; file tidak akan dikirim ulang.' };
}

export const DevToolsSection: React.FC<DevToolsSectionProps> = ({
  discordUser,
  onOpenDiscordAuth,
}) => {
  // Active tool tab: Audio or Image (DIPISAH)
  const [activeTool, setActiveTool] = useState<'audio' | 'image'>('audio');

  // Roblox Account Connection State
  const [robloxSession, setRobloxSession] = useState<RobloxSession | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Free users are limited to ten successful uploads per day; Premium users are unlimited.
  const [dailyQuota, setDailyQuota] = useState<{
    limit: number;
    used: number;
    remaining: number;
    unlimited: boolean;
  }>({
    limit: 10,
    used: 0,
    remaining: 10,
    unlimited: false,
  });

  // Audio Customization Settings
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [audioPitch, setAudioPitch] = useState<number>(1.0);
  const [audioVolume, setAudioVolume] = useState<number>(100);

  // Upload Queues for Audio and Image (Max 10 per batch)
  const [audioQueue, setAudioQueue] = useState<UploadQueueItem[]>([]);
  const [imageQueue, setImageQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Audio Playback state for preview
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Media URL Fetch State (YouTube, TikTok, YouTube Music)
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedMedia, setFetchedMedia] = useState<{
    platform: 'youtube' | 'youtube_music' | 'tiktok';
    title: string;
    author: string;
    thumbnail: string;
    duration: number;
    audioUrl: string;
    proxyAudioUrl: string;
  } | null>(null);
  const [isAddingFetched, setIsAddingFetched] = useState(false);
  const [isPlayingFetched, setIsPlayingFetched] = useState(false);
  const fetchedAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Load saved Roblox session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('roblox_cloud_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.userId && parsed.apiKey) {
          setRobloxSession(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading roblox session:', e);
    }
  }, []);

  // The server is authoritative for both free quota and Premium status.
  const fetchDailyQuota = async () => {
    if (!discordUser || !discordUser.id) return;
    try {
      const res = await fetch('/api/roblox/limit', { cache: 'no-store' });
      const data: {
        success?: boolean;
        limit?: number;
        used?: number;
        remaining?: number;
        unlimited?: boolean;
      } = await res.json();
      if (res.ok && data.success) {
        setDailyQuota({
          limit: data.limit ?? 10,
          used: data.used ?? 0,
          remaining: data.remaining ?? 0,
          unlimited: Boolean(data.unlimited),
        });
      }
    } catch (e) {
      console.error('Error fetching quota:', e);
    }
  };

  useEffect(() => {
    fetchDailyQuota();
  }, [discordUser?.id, discordUser?.isPremium]);

  // Recommended In-Game Roblox PlaybackSpeed
  const recommendedPlaybackSpeed = audioSpeed > 0 ? (1 / audioSpeed).toFixed(2) : '1.00';

  // Bypass Presets
  const applyPreset = (speed: number, pitch: number) => {
    setAudioSpeed(speed);
    setAudioPitch(pitch);
    // If playing preview, update live playback rate
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = speed;
    }
  };

  // Format seconds to mm:ss
  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Fetch audio info from YouTube, TikTok, or YouTube Music URL
  const handleFetchMediaUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetUrl = urlInput.trim();
    if (!targetUrl) {
      setFetchError('Masukkan URL YouTube, YouTube Music, atau TikTok terlebih dahulu.');
      return;
    }

    setIsFetchingUrl(true);
    setFetchError(null);
    setFetchedMedia(null);
    if (fetchedAudioPlayerRef.current) {
      fetchedAudioPlayerRef.current.pause();
      setIsPlayingFetched(false);
    }

    try {
      const res = await fetch('/api/media/fetch-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFetchedMedia(data);
      } else {
        setFetchError(data.error || 'Gagal mengambil audio dari link tersebut.');
      }
    } catch (err: any) {
      setFetchError('Koneksi gagal: ' + err.message);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Add fetched audio directly to the upload queue (applies DSP bypass settings)
  const handleAddFetchedToQueue = async () => {
    if (!fetchedMedia) return;

    if (!discordUser) {
      onOpenDiscordAuth();
      return;
    }

    if (!dailyQuota.unlimited && dailyQuota.remaining <= 0) {
      alert('Kuota upload hari ini sudah habis (10/10). Kuota akan reset kembali pada jam 00:00!');
      return;
    }

    if (audioQueue.length >= 10) {
      alert('Maksimal 10 file audio dalam satu antrean batch!');
      return;
    }

    setIsAddingFetched(true);

    try {
      const res = await fetch(fetchedMedia.proxyAudioUrl);
      if (!res.ok) {
        throw new Error(`Gagal mendownload audio stream (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const ext = fetchedMedia.platform === 'tiktok' ? '.mp3' : '.webm';
      const cleanTitle = fetchedMedia.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'stream_audio';
      const fileName = `${cleanTitle}${ext}`;
      const file = new File([blob], fileName, { type: blob.type || 'audio/mpeg' });

      const newQueueItem: UploadQueueItem = {
        id: `fetched-${Date.now()}`,
        file,
        name: fileName,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        type: 'Audio',
        speed: audioSpeed,
        pitch: audioPitch,
        volume: audioVolume,
        status: 'pending',
        previewUrl: URL.createObjectURL(file),
      };

      setAudioQueue((prev) => [...prev, newQueueItem]);
      setFetchedMedia(null);
      setUrlInput('');
      if (fetchedAudioPlayerRef.current) {
        fetchedAudioPlayerRef.current.pause();
        setIsPlayingFetched(false);
      }
    } catch (err: any) {
      alert('Gagal menambahkan ke antrean: ' + err.message);
    } finally {
      setIsAddingFetched(false);
    }
  };

  // Toggle play audio preview for fetched media
  const togglePlayFetchedPreview = () => {
    if (!fetchedMedia || !fetchedAudioPlayerRef.current) return;
    if (isPlayingFetched) {
      fetchedAudioPlayerRef.current.pause();
      setIsPlayingFetched(false);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setPlayingAudioId(null);
      }
      fetchedAudioPlayerRef.current.src = fetchedMedia.proxyAudioUrl;
      fetchedAudioPlayerRef.current.playbackRate = audioSpeed;
      fetchedAudioPlayerRef.current.volume = audioVolume / 100;
      fetchedAudioPlayerRef.current
        .play()
        .then(() => setIsPlayingFetched(true))
        .catch(() => setIsPlayingFetched(false));
    }
  };

  // Connect Roblox Account handler
  const handleConnectRoblox = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setConnectError(null);

    const key = apiKeyInput.trim();
    const uid = userIdInput.trim();

    if (!key || !uid) {
      setConnectError('Harap masukkan Roblox API Key dan User ID Roblox.');
      setConnecting(false);
      return;
    }

    try {
      const res = await fetch(`/api/roblox/user-info?userId=${encodeURIComponent(uid)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setConnectError(data.error || 'User ID Roblox tidak valid atau tidak ditemukan.');
        setConnecting(false);
        return;
      }

      const session: RobloxSession = {
        apiKey: key,
        userId: data.user.id,
        name: data.user.name,
        displayName: data.user.displayName,
        avatarUrl: data.user.avatarUrl,
      };

      setRobloxSession(session);
      localStorage.setItem('roblox_cloud_session', JSON.stringify(session));
      setApiKeyInput('');
      setUserIdInput('');
    } catch (err: any) {
      setConnectError(err.message || 'Gagal menghubungi server untuk memvalidasi akun.');
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect Roblox Account
  const handleDisconnect = () => {
    if (confirm('Yakin ingin memutuskan koneksi akun Roblox ini?')) {
      localStorage.removeItem('roblox_cloud_session');
      setRobloxSession(null);
    }
  };

  // Add files to Audio Queue (Max 10 per batch, respecting remaining quota)
  const handleAudioFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!discordUser) {
      onOpenDiscordAuth();
      return;
    }

    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!dailyQuota.unlimited && dailyQuota.remaining <= 0) {
      alert('Kuota upload hari ini sudah habis (10/10). Kuota akan reset kembali pada jam 00:00!');
      return;
    }

    const availableQuota = dailyQuota.unlimited ? 10 : dailyQuota.remaining;
    const maxCanAdd = Math.min(10 - audioQueue.length, availableQuota - audioQueue.length);

    if (maxCanAdd <= 0) {
      alert(`Maksimal 10 file per batch dan sisa kuota hari ini adalah ${dailyQuota.remaining} file!`);
      return;
    }

    const allowedFiles = files.slice(0, maxCanAdd);

    const newItems: UploadQueueItem[] = allowedFiles.map((file, idx) => ({
      id: `audio-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: 'Audio',
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      speed: audioSpeed,
      pitch: audioPitch,
      volume: audioVolume,
    }));

    setAudioQueue((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  // Add files to Image Queue (Max 10 per batch, respecting remaining quota)
  const handleImageFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!discordUser) {
      onOpenDiscordAuth();
      return;
    }

    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!dailyQuota.unlimited && dailyQuota.remaining <= 0) {
      alert('Kuota upload hari ini sudah habis (10/10). Kuota akan reset kembali pada jam 00:00!');
      return;
    }

    const availableQuota = dailyQuota.unlimited ? 10 : dailyQuota.remaining;
    const maxCanAdd = Math.min(10 - imageQueue.length, availableQuota - imageQueue.length);

    if (maxCanAdd <= 0) {
      alert(`Maksimal 10 file per batch dan sisa kuota hari ini adalah ${dailyQuota.remaining} file!`);
      return;
    }

    const allowedFiles = files.slice(0, maxCanAdd);

    const newItems: UploadQueueItem[] = allowedFiles.map((file, idx) => ({
      id: `image-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: 'Decal',
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      speed: 1.0,
      pitch: 1.0,
      volume: 100,
    }));

    setImageQueue((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  // Remove single item from queue
  const removeQueueItem = (type: 'audio' | 'image', id: string) => {
    if (type === 'audio') {
      setAudioQueue((prev) => prev.filter((item) => item.id !== id));
      if (playingAudioId === id && audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setPlayingAudioId(null);
      }
    } else {
      setImageQueue((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Clear entire queue
  const clearQueue = (type: 'audio' | 'image') => {
    if (type === 'audio') {
      setAudioQueue([]);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setPlayingAudioId(null);
      }
    } else {
      setImageQueue([]);
    }
  };

  // Audio Play / Pause preview with realtime speed
  const togglePlayAudio = (id: string, url: string) => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
    }
    const audio = audioPlayerRef.current;

    if (playingAudioId === id) {
      audio.pause();
      setPlayingAudioId(null);
    } else {
      audio.src = url;
      audio.playbackRate = audioSpeed;
      audio.volume = Math.min(1, audioVolume / 100);
      audio.play().catch(() => {});
      setPlayingAudioId(id);
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  // Start Bulk Uploading to Roblox Open Cloud
  const handleStartBulkUpload = async (type: 'audio' | 'image') => {
    if (!discordUser) {
      alert('Harap hubungkan akun Discord terlebih dahulu untuk mengaktifkan kuota upload harian!');
      onOpenDiscordAuth();
      return;
    }

    if (!robloxSession) {
      alert('Silakan hubungkan akun Roblox terlebih dahulu dengan API Key & User ID!');
      return;
    }

    const currentQueue = type === 'audio' ? audioQueue : imageQueue;
    let pendingItems = currentQueue.filter((item) => item.status === 'pending' || item.status === 'error');

    if (pendingItems.length === 0) {
      alert('Tidak ada file baru untuk di-upload.');
      return;
    }

    const hasNewUploads = pendingItems.some((item) => !item.operationId && !item.assetId);
    if (hasNewUploads && !dailyQuota.unlimited && dailyQuota.remaining <= 0) {
      pendingItems = pendingItems.filter((item) => item.operationId || item.assetId);
      if (pendingItems.length === 0) {
        alert('Kuota upload kamu hari ini sudah habis (10/10). Tunggu reset esok hari jam 00:00!');
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: pendingItems.length });

    const setQueue = type === 'audio' ? setAudioQueue : setImageQueue;
    let successfulUploadsCount = 0;

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      setUploadProgress({ current: i + 1, total: pendingItems.length });

      // Update status to processing / uploading
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'processing' } : q))
      );

      try {
        let fileToUpload = item.processedFile || item.file;

        if (!item.operationId && !item.assetId) {
          if (
            type === 'audio'
            && (audioSpeed !== 1.0 || audioVolume !== 100 || item.file.size > MAX_PROCESSED_AUDIO_BYTES)
          ) {
            fileToUpload = await processAudioFile(
              item.file,
              audioSpeed,
              audioVolume,
              item.file.size > MAX_PROCESSED_AUDIO_BYTES
            );
          }

          if (fileToUpload.size > MAX_UPLOAD_REQUEST_BYTES) {
            throw new Error('File upload melebihi 4 MB. Potong durasi audio atau gunakan file yang lebih kecil.');
          }
        }

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q))
        );

        let assetId = item.assetId;
        let operationId = item.operationId;
        let moderationState = item.moderationState;

        if (!operationId && !assetId) {
          const formData = new FormData();
          formData.append('file', fileToUpload);
          formData.append('assetType', type === 'audio' ? 'Audio' : 'Decal');
          formData.append('displayName', item.name.replace(/\.[^/.]+$/, ''));
          formData.append('apiKey', robloxSession.apiKey);
          formData.append('userId', robloxSession.userId);

          const response = await fetch('/api/roblox/upload', {
            method: 'POST',
            body: formData,
          });
          const result = await readUploadResponse(response);

          if (!response.ok || !result.success) {
            throw new Error(result.error || `Upload ditolak (HTTP ${response.status}).`);
          }

          assetId = result.assetId;
          operationId = result.operationId;
          moderationState = result.moderationState;
          if (operationId) {
            setQueue((prev) => prev.map((queueItem) => (
              queueItem.id === item.id
                ? { ...queueItem, status: 'processing', operationId }
                : queueItem
            )));
          }
        }

        if (!assetId && operationId) {
          const operationResult = await waitForRobloxOperation(
            operationId,
            robloxSession.apiKey,
            () => setQueue((prev) => prev.map((queueItem) => (
              queueItem.id === item.id ? { ...queueItem, status: 'processing', operationId } : queueItem
            )))
          );
          if (operationResult.error) {
            setQueue((prev) => prev.map((queueItem) => (
              queueItem.id === item.id
                ? {
                    ...queueItem,
                    status: 'error',
                    operationId: operationResult.done ? undefined : operationId,
                    errorMessage: operationResult.error,
                  }
                : queueItem
            )));
            continue;
          }
          assetId = operationResult.assetId;
          moderationState = operationResult.moderationState;
        }

        if (assetId) {
          successfulUploadsCount++;
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: 'success',
                    assetId: String(assetId),
                    operationId: undefined,
                    moderationState,
                    errorMessage: undefined,
                  }
                : q
            )
          );
        } else {
          throw new Error('Upload tidak menghasilkan Asset ID Roblox.');
        }
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'error', errorMessage: err.message || 'Network error' }
              : q
          )
        );
      }

      // Small delay between uploads
      await new Promise((r) => setTimeout(r, 500));
    }

    await fetchDailyQuota();
    setIsUploading(false);
  };

  // Copy single Asset ID
  const handleCopyAssetId = (assetId: string) => {
    navigator.clipboard.writeText(assetId);
    setCopiedId(assetId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy All Asset IDs (as plain list or Luau Array)
  const handleCopyAllIds = (type: 'audio' | 'image', asLuauArray: boolean = false) => {
    const queue = type === 'audio' ? audioQueue : imageQueue;
    const successfulIds = queue
      .filter((q) => q.status === 'success' && q.assetId)
      .map((q) => q.assetId);

    if (successfulIds.length === 0) {
      alert('Belum ada Asset ID yang berhasil di-upload.');
      return;
    }

    let textToCopy = '';
    if (asLuauArray) {
      textToCopy = `-- Roblox ${type === 'audio' ? 'Audio' : 'Decal'} Asset IDs\nreturn {\n  ${successfulIds.map((id) => `"${id}"`).join(',\n  ')}\n}`;
    } else {
      textToCopy = successfulIds.join(', ');
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Copy Roblox Studio Script PlaybackSpeed
  const handleCopyScript = () => {
    const script = `-- Script Roblox Studio (Normal Speed In-Game)\nsound.PlaybackSpeed = ${recommendedPlaybackSpeed}\nsound:Play()`;
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Download log report (.txt)
  const handleDownloadLog = (type: 'audio' | 'image') => {
    const queue = type === 'audio' ? audioQueue : imageQueue;
    if (queue.length === 0) return;

    let content = `=== ROBLOX ${type.toUpperCase()} BULK UPLOAD REPORT ===\n`;
    content += `Account: ${robloxSession ? `${robloxSession.displayName} (@${robloxSession.name}) - ID: ${robloxSession.userId}` : 'Unconnected'}\n`;
    content += `Discord User: ${discordUser ? `@${discordUser.username} (${discordUser.id})` : 'Guest'}\n`;
    content += `Date: ${new Date().toLocaleString()}\n`;
    if (type === 'audio') {
      content += `Audio Speed: ${audioSpeed}x | Pitch: ${audioPitch}x | Volume: ${audioVolume}%\n`;
      content += `Recommended In-Game PlaybackSpeed: ${recommendedPlaybackSpeed}\n`;
    }
    content += `Total Files: ${queue.length}\n\n`;

    queue.forEach((q, idx) => {
      content += `[${idx + 1}] File: ${q.name}\n`;
      content += `    Status: ${q.status.toUpperCase()}\n`;
      if (q.assetId) content += `    Roblox Asset ID: ${q.assetId}\n`;
      if (q.errorMessage) content += `    Error: ${q.errorMessage}\n`;
      content += `\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roblox-${type}-bulk-upload-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeQueue = activeTool === 'audio' ? audioQueue : imageQueue;
  const successCount = activeQueue.filter((q) => q.status === 'success').length;
  const errorCount = activeQueue.filter((q) => q.status === 'error').length;

  return (
    <section id="tools" className="py-16 border-b border-border bg-[#09090c] text-foreground relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-mono text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span>ROBLOX OPEN CLOUD BULK UPLOADER</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white uppercase font-mono">
            Roblox Bulk <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Uploader Tools</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Upload langsung ke akun Roblox Studio dengan bypass audio speed & pitch. Maksimal <strong>10 file per batch</strong> dengan kuota <strong>10 upload per hari</strong> terikat akun Discord.
          </p>
        </div>

        {/* DISCORD AUTHORIZATION & DAILY LIMIT STATUS BAR */}
        <div className="rounded-2xl border border-zinc-800 bg-[#121217] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30 flex items-center justify-center text-[#5865F2] shrink-0">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white">
                  {discordUser ? `Discord: @${discordUser.username}` : 'Discord Belum Terhubung'}
                </span>
                {discordUser && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                    {discordUser.isPremium ? 'Premium Aktif' : 'Limit Aktif'}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {discordUser
                  ? discordUser.isPremium
                    ? 'Akun Premium aktif: upload audio dan gambar tanpa batas harian selama masa aktif.'
                    : 'Kuota gratis 10 upload sukses per hari, diverifikasi server dan terhubung ke akun Discord.'
                  : 'Harap login Discord terlebih dahulu agar kuota upload harian dapat tersimpan.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Daily Quota Counter */}
            <div className="rounded-xl border border-zinc-700 bg-black/60 px-4 py-2 text-center">
              <span className="text-[10px] font-mono text-zinc-500 block uppercase">
                {dailyQuota.unlimited ? 'Premium Upload' : 'Sisa Kuota Hari Ini'}
              </span>
              <span className={`text-base font-mono font-bold ${dailyQuota.unlimited || dailyQuota.remaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {dailyQuota.unlimited ? 'Unlimited' : `${dailyQuota.remaining} / ${dailyQuota.limit} Upload`}
              </span>
            </div>

            {!discordUser && (
              <button
                onClick={onOpenDiscordAuth}
                className="flex items-center gap-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] px-4 py-2 text-xs font-mono font-bold text-white transition-all shadow-md active:scale-95"
              >
                <span>Authorize Discord</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. ROBLOX ACCOUNT CONNECTION SECTION */}
        <div className="rounded-2xl border border-zinc-800 bg-[#101014] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          {robloxSession ? (
            /* CONNECTED: PROFIL ROBLOX AVATAR, USERNAME, DISPLAYNAME (FORM INPUT HILANG) */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={robloxSession.avatarUrl}
                    alt={robloxSession.displayName}
                    className="h-16 w-16 rounded-full border-2 border-emerald-400/80 bg-zinc-900 object-cover shadow-lg"
                  />
                  <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-[#101014]" title="Connected" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white font-mono leading-tight">
                      {robloxSession.displayName}
                    </h3>
                    <span className="rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono px-2 py-0.5">
                      Roblox Verified
                    </span>
                  </div>

                  <p className="text-xs font-mono text-zinc-400 mt-0.5">
                    @{robloxSession.name} • <span className="text-zinc-500">ID: {robloxSession.userId}</span>
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-blue-400">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                    <span>Open Cloud API Key Aktif (Siap Bulk Upload)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 text-xs font-mono text-red-400 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Ganti Akun / Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            /* NOT CONNECTED: FORM INPUT API KEY & USER ID */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
                    <Key className="h-4 w-4 text-blue-400" />
                    <span>Hubungkan Akun Roblox (Open Cloud API)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Masukkan API Key & User ID Roblox kamu untuk upload audio/gambar langsung ke akun Roblox Studio kamu.
                  </p>
                </div>

                <a
                  href="https://create.roblox.com/dashboard/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono text-blue-400 hover:text-blue-300 underline"
                >
                  <span>Buka Creator Dashboard (Buat API Key)</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {connectError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 font-mono">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{connectError}</span>
                </div>
              )}

              <form onSubmit={handleConnectRoblox} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* API Key */}
                <div className="sm:col-span-6">
                  <label className="block text-xs font-mono text-zinc-300 mb-1">
                    1. Roblox Open Cloud API Key *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      required
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Paste Roblox API Key (Permissions: Assets read & write)"
                      className="w-full rounded-xl border border-zinc-700 bg-black py-2.5 pl-3.5 pr-10 text-xs text-white focus:border-blue-400 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 text-zinc-500 hover:text-zinc-300"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* User ID */}
                <div className="sm:col-span-3">
                  <label className="block text-xs font-mono text-zinc-300 mb-1">
                    2. Roblox User ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    placeholder="e.g. 138947291"
                    className="w-full rounded-xl border border-zinc-700 bg-black py-2.5 px-3.5 text-xs text-white focus:border-blue-400 focus:outline-none font-mono"
                  />
                </div>

                {/* Submit Connect Button */}
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    disabled={connecting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 px-4 text-xs font-bold font-mono text-white transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${connecting ? 'animate-spin' : ''}`} />
                    <span>{connecting ? 'Menghubungkan...' : 'Konek Akun Roblox'}</span>
                  </button>
                </div>
              </form>

              <div className="rounded-lg bg-zinc-900/60 p-2.5 text-[11px] font-mono text-zinc-400 border border-zinc-800">
                💡 <strong>Cara buat API Key:</strong> Buka Creator Dashboard ➔ Credentials ➔ Create API Key ➔ Tambahkan permission <strong>Assets (Read & Write)</strong> ➔ Copy API Key dan paste di atas.
              </div>
            </div>
          )}
        </div>

        {/* 2. DEDICATED TOOLS NAVIGATION (DIPISAH: AUDIO vs IMAGE) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTool('audio')}
              className={`flex items-center gap-2.5 rounded-xl px-5 py-3 text-xs font-bold font-mono uppercase transition-all ${
                activeTool === 'audio'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-102 border border-blue-400'
                  : 'bg-surface border border-border text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <Music className="h-4 w-4" />
              <span>1. Audio Uploader ({audioQueue.length}/10)</span>
            </button>

            <button
              onClick={() => setActiveTool('image')}
              className={`flex items-center gap-2.5 rounded-xl px-5 py-3 text-xs font-bold font-mono uppercase transition-all ${
                activeTool === 'image'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 scale-102 border border-purple-400'
                  : 'bg-surface border border-border text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              <span>2. Image Uploader ({imageQueue.length}/10)</span>
            </button>
          </div>

          <div className="text-xs font-mono text-zinc-400">
            Tool Aktif: <strong className="text-white">{activeTool === 'audio' ? '🎵 ROBLOX AUDIO BULK UPLOADER' : '🖼️ ROBLOX IMAGE BULK UPLOADER'}</strong>
          </div>
        </div>

        {/* 3. TOOL CONTENT PANELS */}
        {activeTool === 'audio' ? (
          /* ============================================================== */
          /* 🎵 AUDIO UPLOADER VIEW (DIPISAH + SPEED/PITCH/VOLUME SETTINGS) */
          /* ============================================================== */
          <div className="space-y-6">

            {/* AUDIO BYPASS & SPEED / PITCH / VOLUME CONTROLS */}
            <div className="rounded-2xl border border-zinc-800 bg-[#101014] p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-blue-400" />
                    <span>Audio Bypass DSP Settings (Speed, Pitch, Volume)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Ubah kecepatan & pitch audio untuk lolos deteksi otomatis Roblox. Hasil preview dan upload akan mengikuti settingan ini!
                  </p>
                </div>

                <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-1 text-xs font-mono text-blue-400">
                  Speed: <strong>{audioSpeed}x</strong> • Pitch: <strong>{audioPitch}x</strong>
                </div>
              </div>

              {/* Template Bypass Buttons */}
              <div>
                <span className="block text-xs font-mono text-zinc-400 mb-2 font-semibold">
                  ⚡ Pilihan Template Bypass Otomatis (Kombinasi Speed & Pitch):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <button
                    onClick={() => applyPreset(1.0, 1.0)}
                    className={`rounded-xl border p-2.5 text-center transition-all ${
                      audioSpeed === 1.0
                        ? 'border-white bg-white text-black font-bold shadow-md'
                        : 'border-zinc-800 bg-black/60 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span className="block text-xs font-mono">Normal</span>
                    <span className="text-[10px] text-zinc-500 font-mono block">1.0x (Orig)</span>
                  </button>

                  <button
                    onClick={() => applyPreset(1.3, 1.15)}
                    className={`rounded-xl border p-2.5 text-center transition-all ${
                      audioSpeed === 1.3
                        ? 'border-blue-400 bg-blue-500/20 text-blue-300 font-bold shadow-md'
                        : 'border-zinc-800 bg-black/60 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span className="block text-xs font-mono">Bypass 1.3x</span>
                    <span className="text-[10px] text-blue-400/80 font-mono block">Speed: 1.3x</span>
                  </button>

                  <button
                    onClick={() => applyPreset(2.3, 1.35)}
                    className={`rounded-xl border p-2.5 text-center transition-all ${
                      audioSpeed === 2.3
                        ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300 font-bold shadow-md'
                        : 'border-zinc-800 bg-black/60 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span className="block text-xs font-mono">Bypass 2.3x</span>
                    <span className="text-[10px] text-indigo-400/80 font-mono block">Speed: 2.3x</span>
                  </button>

                  <button
                    onClick={() => applyPreset(2.5, 1.45)}
                    className={`rounded-xl border p-2.5 text-center transition-all ${
                      audioSpeed === 2.5
                        ? 'border-purple-400 bg-purple-500/20 text-purple-300 font-bold shadow-md'
                        : 'border-zinc-800 bg-black/60 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span className="block text-xs font-mono">Bypass 2.5x</span>
                    <span className="text-[10px] text-purple-400/80 font-mono block">Speed: 2.5x</span>
                  </button>

                  <button
                    onClick={() => applyPreset(3.0, 1.6)}
                    className={`rounded-xl border p-2.5 text-center transition-all ${
                      audioSpeed === 3.0
                        ? 'border-rose-400 bg-rose-500/20 text-rose-300 font-bold shadow-md'
                        : 'border-zinc-800 bg-black/60 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span className="block text-xs font-mono">Bypass 3.0x</span>
                    <span className="text-[10px] text-rose-400/80 font-mono block">Speed: 3.0x</span>
                  </button>
                </div>
              </div>

              {/* Sliders Grid: Speed, Pitch, Volume */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                {/* Speed Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400">Audio Speed:</span>
                    <span className="text-white font-bold">{audioSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.1"
                    value={audioSpeed}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setAudioSpeed(val);
                      if (audioPlayerRef.current) audioPlayerRef.current.playbackRate = val;
                    }}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                    <span>0.5x</span>
                    <span>1.0x</span>
                    <span>2.3x</span>
                    <span>4.0x</span>
                  </div>
                </div>

                {/* Pitch Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400">Audio Pitch:</span>
                    <span className="text-white font-bold">{audioPitch.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={audioPitch}
                    onChange={(e) => setAudioPitch(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                    <span>0.5x (Bass)</span>
                    <span>1.0x</span>
                    <span>2.0x (High)</span>
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400">Audio Volume Boost:</span>
                    <span className="text-white font-bold">{audioVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    step="5"
                    value={audioVolume}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setAudioVolume(val);
                      if (audioPlayerRef.current) audioPlayerRef.current.volume = Math.min(1, val / 100);
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                    <span>20%</span>
                    <span>100%</span>
                    <span>200%</span>
                  </div>
                </div>
              </div>

              {/* REAL-TIME RECOMMENDED PLAYBACKSPEED CARD */}
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <Gauge className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-zinc-400 block">
                      Rekomendasi Roblox In-Game PlaybackSpeed:
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl font-mono font-bold text-white tracking-wider">
                        {recommendedPlaybackSpeed}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        (Formula: 1 / {audioSpeed.toFixed(1)}x = {recommendedPlaybackSpeed})
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-mono font-bold text-white transition-all shadow-md active:scale-95 shrink-0"
                >
                  {copiedScript ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedScript ? 'Script Copied!' : 'Copy Script PlaybackSpeed'}</span>
                </button>
              </div>
            </div>

            {/* Upload Zone (Max 10) */}
            <div className="rounded-2xl border-2 border-dashed border-blue-500/40 bg-blue-500/5 p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                id="bulk-audio-file-input"
                multiple
                accept=".mp3,.ogg,.wav"
                onChange={handleAudioFilesSelected}
                className="hidden"
              />
              <label htmlFor="bulk-audio-file-input" className="cursor-pointer block space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
                  <FileAudio className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    Pilih File Audio (.mp3, .ogg) — Maksimal 10 File Sekali Upload
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Drag & drop atau klik untuk memilih file audio dari komputer atau HP kamu.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/20 px-3.5 py-1 text-xs font-mono text-blue-300">
                  <span>
                    Batch Saat Ini: {audioQueue.length} / 10 Audio • {dailyQuota.unlimited ? 'Kuota Harian: Unlimited' : `Sisa Kuota Hari Ini: ${dailyQuota.remaining}`}
                  </span>
                </div>
              </label>
            </div>

{/* Divider OR / ATAU */}
            <div className="flex items-center gap-4 my-2">
              <div className="h-px bg-zinc-800 flex-1" />
              <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase">
                ATAU SALIN LINK MEDIA
              </span>
              <div className="h-px bg-zinc-800 flex-1" />
            </div>

            {/* Fetch Audio from YouTube / TikTok / YouTube Music */}
            <div className="rounded-2xl border border-zinc-800 bg-[#101014] p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                    <Music className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Fetch Audio dari Link (YouTube, TikTok, YT Music)
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Tempel link video/lagu, sistem otomatis mengambil thumbnail, judul, durasi & audio stream.
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[10px] font-mono text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-0.5 rounded">
                    YouTube
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded">
                    TikTok
                  </span>
                  <span className="text-[10px] font-mono text-purple-400 border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 rounded">
                    YT Music
                  </span>
                </div>
              </div>

              <form onSubmit={handleFetchMediaUrl} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... atau https://vt.tiktok.com/..."
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-white focus:outline-none font-mono"
                  />
                  {urlInput && (
                    <button
                      type="button"
                      onClick={() => setUrlInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isFetchingUrl || !urlInput.trim()}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-mono font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 shrink-0"
                >
                  {isFetchingUrl ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Mengambil Audio...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Fetch Audio</span>
                    </>
                  )}
                </button>
              </form>

              {fetchError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 font-mono">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{fetchError}</span>
                </div>
              )}

              {/* Fetched Media Result Card */}
              {fetchedMedia && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    {fetchedMedia.thumbnail && (
                      <div className="relative h-16 w-24 rounded-lg overflow-hidden border border-zinc-800 bg-black shrink-0">
                        <img
                          src={fetchedMedia.thumbnail}
                          alt={fetchedMedia.title}
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.2 text-[9px] font-mono font-bold text-white">
                          {formatDuration(fetchedMedia.duration)}
                        </span>
                      </div>
                    )}

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-2 py-0.2 rounded font-bold uppercase ${
                          fetchedMedia.platform === 'tiktok'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : fetchedMedia.platform === 'youtube_music'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {fetchedMedia.platform === 'tiktok' ? 'TikTok' : fetchedMedia.platform === 'youtube_music' ? 'YouTube Music' : 'YouTube'}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 truncate">
                          {fetchedMedia.author}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate max-w-md font-mono">
                        {fetchedMedia.title}
                      </h4>
                      <p className="text-[10px] font-mono text-emerald-400">
                        ✓ Audio Stream Siap Dimainkan & Di-upload
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={togglePlayFetchedPreview}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:border-zinc-500 px-3.5 py-2 text-xs font-mono text-zinc-200 transition-colors"
                    >
                      {isPlayingFetched ? (
                        <>
                          <Pause className="h-3.5 w-3.5 text-blue-400" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 text-blue-400" />
                          <span>Preview Audio</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleAddFetchedToQueue}
                      disabled={isAddingFetched || (!dailyQuota.unlimited && dailyQuota.remaining <= 0) || audioQueue.length >= 10}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-mono font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-40"
                    >
                      {isAddingFetched ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Memasukkan...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          <span>+ Tambah ke Antrean</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Audio Queue Management */}
            {audioQueue.length > 0 && (
              <div className="space-y-4">
                {/* Queue Control Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-zinc-800 bg-[#121217]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-300 font-bold">
                      Antrian: {audioQueue.length} Audio
                    </span>
                    {successCount > 0 && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        {successCount} Berhasil
                      </span>
                    )}
                    {errorCount > 0 && (
                      <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                        {errorCount} Gagal
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleStartBulkUpload('audio')}
                      disabled={isUploading || !robloxSession || !discordUser || (!dailyQuota.unlimited && dailyQuota.remaining <= 0 && !audioQueue.some((item) => item.status === 'error' && item.operationId))}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-mono font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Upload className={`h-3.5 w-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
                      <span>{isUploading ? `Uploading (${uploadProgress.current}/${uploadProgress.total})...` : `Upload Semua Audio (${audioQueue.length})`}</span>
                    </button>

                    {successCount > 0 && (
                      <>
                        <button
                          onClick={() => handleCopyAllIds('audio', false)}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white"
                          title="Copy list Asset IDs"
                        >
                          {copiedAll ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>Copy Semua ID</span>
                        </button>

                        <button
                          onClick={() => handleCopyAllIds('audio', true)}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white"
                          title="Copy as Luau Script Table"
                        >
                          <Code2 className="h-3.5 w-3.5 text-blue-400" />
                          <span>Copy Luau Array</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDownloadLog('audio')}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export Log</span>
                    </button>

                    <button
                      onClick={() => clearQueue('audio')}
                      disabled={isUploading}
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-mono text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Bersihkan</span>
                    </button>
                  </div>
                </div>

                {/* Audio Items List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {audioQueue.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-800 bg-[#101014] p-3.5 space-y-2 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={() => togglePlayAudio(item.id, item.previewUrl)}
                            className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 hover:bg-blue-500 hover:text-white transition-colors"
                            title="Play/Pause Preview Audio dengan Speed aktif"
                          >
                            {playingAudioId === item.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-mono font-bold text-white truncate" title={item.name}>
                              #{idx + 1} {item.name}
                            </p>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {item.size} • Speed: {audioSpeed}x
                            </span>
                          </div>
                        </div>

                        {!isUploading && (
                          <button
                            onClick={() => removeQueueItem('audio', item.id)}
                            className="text-zinc-500 hover:text-red-400 p-1"
                            title="Hapus dari antrian"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Status / Result */}
                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                        {item.status === 'pending' && (
                          <span className="text-zinc-400 text-[11px]">Siap di-upload ({audioSpeed}x)</span>
                        )}
                        {item.status === 'processing' && (
                          <span className="text-amber-400 text-[11px] flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Processing DSP...
                          </span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="text-blue-400 text-[11px] flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Uploading to Roblox...
                          </span>
                        )}
                        {item.status === 'success' && (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-emerald-400 text-[11px] font-bold">
                              ID: {item.assetId}
                            </span>
                            {item.moderationState && item.moderationState !== 'MODERATION_STATE_APPROVED' && (
                              <span className="text-amber-400 text-[10px]">
                                Roblox moderation: {item.moderationState.replace('MODERATION_STATE_', '').toLowerCase()}
                              </span>
                            )}
                            <button
                              onClick={() => handleCopyAssetId(item.assetId!)}
                              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded flex items-center gap-1"
                            >
                              {copiedId === item.assetId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedId === item.assetId ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        )}
                        {item.status === 'error' && (
                          <span className="text-red-400 text-[10px] truncate" title={item.errorMessage}>
                            Error: {item.errorMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* 🖼️ IMAGE UPLOADER VIEW (DIPISAH, MAX 10/BATCH & 10/DAY)         */
          /* ============================================================== */
          <div className="space-y-6">
            {/* Upload Zone (Max 10) */}
            <div className="rounded-2xl border-2 border-dashed border-purple-500/40 bg-purple-500/5 p-8 text-center hover:border-purple-500 transition-colors">
              <input
                type="file"
                id="bulk-image-file-input"
                multiple
                accept=".png,.jpg,.jpeg,.tga,.bmp"
                onChange={handleImageFilesSelected}
                className="hidden"
              />
              <label htmlFor="bulk-image-file-input" className="cursor-pointer block space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
                  <ImageIcon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    Pilih File Gambar / Decal (.png, .jpg, .tga) — Maksimal 10 File Sekali Upload
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Drag & drop atau klik untuk memilih file gambar dari komputer atau HP kamu.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/20 px-3.5 py-1 text-xs font-mono text-purple-300">
                  <span>
                    Batch Saat Ini: {imageQueue.length} / 10 Gambar • {dailyQuota.unlimited ? 'Kuota Harian: Unlimited' : `Sisa Kuota Hari Ini: ${dailyQuota.remaining}`}
                  </span>
                </div>
              </label>
            </div>

            {/* Image Queue Management */}
            {imageQueue.length > 0 && (
              <div className="space-y-4">
                {/* Queue Control Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-zinc-800 bg-[#121217]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-300 font-bold">
                      Antrian: {imageQueue.length} Gambar
                    </span>
                    {successCount > 0 && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        {successCount} Berhasil
                      </span>
                    )}
                    {errorCount > 0 && (
                      <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                        {errorCount} Gagal
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleStartBulkUpload('image')}
                      disabled={isUploading || !robloxSession || !discordUser || (!dailyQuota.unlimited && dailyQuota.remaining <= 0 && !imageQueue.some((item) => item.status === 'error' && item.operationId))}
                      className="flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-mono font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Upload className={`h-3.5 w-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
                      <span>{isUploading ? `Uploading (${uploadProgress.current}/${uploadProgress.total})...` : `Upload Semua Gambar (${imageQueue.length})`}</span>
                    </button>

                    {successCount > 0 && (
                      <>
                        <button
                          onClick={() => handleCopyAllIds('image', false)}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white"
                          title="Copy list Asset IDs"
                        >
                          {copiedAll ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>Copy Semua ID</span>
                        </button>

                        <button
                          onClick={() => handleCopyAllIds('image', true)}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white"
                          title="Copy as Luau Script Table"
                        >
                          <Code2 className="h-3.5 w-3.5 text-purple-400" />
                          <span>Copy Luau Array</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDownloadLog('image')}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export Log</span>
                    </button>

                    <button
                      onClick={() => clearQueue('image')}
                      disabled={isUploading}
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-mono text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Bersihkan</span>
                    </button>
                  </div>
                </div>

                {/* Image Grid with Thumbnails */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {imageQueue.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-800 bg-[#101014] p-2.5 space-y-2 hover:border-zinc-700 transition-colors relative flex flex-col justify-between"
                    >
                      <div>
                        {/* Thumbnail Preview */}
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-black border border-zinc-800">
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                          {!isUploading && (
                            <button
                              onClick={() => removeQueueItem('image', item.id)}
                              className="absolute top-1 right-1 h-6 w-6 rounded-md bg-black/80 text-zinc-400 hover:text-red-400 flex items-center justify-center text-xs"
                              title="Hapus"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <p className="text-[11px] font-mono font-bold text-white truncate mt-1.5" title={item.name}>
                          #{idx + 1} {item.name}
                        </p>
                        <span className="text-[10px] font-mono text-zinc-500">{item.size}</span>
                      </div>

                      {/* Status / Result */}
                      <div className="pt-1.5 border-t border-zinc-800 text-xs font-mono">
                        {item.status === 'pending' && (
                          <span className="text-zinc-500 text-[10px]">Siap</span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="text-purple-400 text-[10px] flex items-center gap-1">
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Uploading...
                          </span>
                        )}
                        {item.status === 'success' && (
                          <div className="space-y-1">
                            <span className="text-emerald-400 text-[10px] font-bold block truncate">
                              ID: {item.assetId}
                            </span>
                            {item.moderationState && item.moderationState !== 'MODERATION_STATE_APPROVED' && (
                              <span className="text-amber-400 text-[9px] block truncate" title={item.moderationState}>
                                Moderation: {item.moderationState.replace('MODERATION_STATE_', '').toLowerCase()}
                              </span>
                            )}
                            <button
                              onClick={() => handleCopyAssetId(item.assetId!)}
                              className="w-full text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-0.5 rounded flex items-center justify-center gap-1"
                            >
                              {copiedId === item.assetId ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                              <span>{copiedId === item.assetId ? 'Copied' : 'Copy ID'}</span>
                            </button>
                          </div>
                        )}
                        {item.status === 'error' && (
                          <span className="text-red-400 text-[9px] block truncate" title={item.errorMessage}>
                            Error
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
};
