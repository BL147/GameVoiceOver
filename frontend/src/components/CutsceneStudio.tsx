import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  Film, 
  Music, 
  Layers, 
  Clock, 
  Maximize2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileVideo,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  X,
  ArrowRight
} from 'lucide-react';
import { Project } from '../types';
import { uploadCutsceneVideo } from '../services/api';
import { SceneAnalysisPanel } from './SceneAnalysisPanel';

interface CutsceneStudioProps {
  project: Project;
  onBack: () => void;
  onProjectUpdated: (updatedProject: Project) => void;
}

export const CutsceneStudio: React.FC<CutsceneStudioProps> = ({
  project,
  onBack,
  onProjectUpdated,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);
  const [activeStudioTab, setActiveStudioTab] = useState<'media' | 'analysis'>('media');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFileSelect = async (file: File) => {
    const validExtensions = ['.mp4', '.mov'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      setErrorMessage(`Unsupported file format "${ext}". Please upload an MP4 or MOV cutscene.`);
      return;
    }

    const maxSize = 150 * 1024 * 1024; // 150MB
    if (file.size > maxSize) {
      setErrorMessage(`File is too large (${formatBytes(file.size)}). Maximum upload size is 150MB.`);
      return;
    }

    try {
      setErrorMessage(null);
      setIsUploading(true);
      setUploadProgress(0);
      setProcessingStep('Uploading cutscene to local storage...');

      // Upload with progress
      const updated = await uploadCutsceneVideo(project.id, file, (percent) => {
        setUploadProgress(percent);
        if (percent === 100) {
          setProcessingStep('Processing with FFmpeg: Extracting audio, thumbnail & representative frames...');
        }
      });

      onProjectUpdated(updated);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to process cutscene video.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setProcessingStep('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-studio-900">
      {/* Studio Header Bar */}
      <header className="h-16 px-6 border-b border-studio-700 bg-studio-800/90 backdrop-blur flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-studio-700/60 hover:bg-studio-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Projects</span>
          </button>
          
          <div className="h-5 w-px bg-studio-700" />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">{project.name}</h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-studio-750 text-indigo-400 border border-studio-700">
                {project.id}
              </span>
              {project.has_video && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Cutscene Ready
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-xs text-slate-400 line-clamp-1">{project.description}</p>
            )}
          </div>
        </div>

        {project.has_video && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-studio-900 p-1 rounded-xl border border-studio-700">
              <button
                onClick={() => setActiveStudioTab('media')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  activeStudioTab === 'media'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Cutscene & Stems</span>
              </button>
              <button
                onClick={() => setActiveStudioTab('analysis')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  activeStudioTab === 'analysis'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Scene Analysis</span>
                {project.scene_analysis && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-lg bg-studio-700 hover:bg-studio-600 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
              title="Replace cutscene file"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replace</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Studio Workspace */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Cutscene Processing Error</p>
              <p className="text-xs text-rose-300/90 mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Upload & Processing State (Visible when no video exists OR currently uploading) */}
        {(!project.has_video || isUploading) && (
          <div className="max-w-3xl mx-auto py-8">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                  : 'border-studio-700 bg-studio-800/60 hover:border-indigo-500/50 hover:bg-studio-800'
              } ${isUploading ? 'pointer-events-none' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,video/mp4,video/quicktime"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              {isUploading ? (
                <div className="space-y-5 max-w-md mx-auto py-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Processing Cutscene...
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{processingStep}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-studio-900 rounded-full h-2.5 overflow-hidden border border-studio-700">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Upload: {uploadProgress}%</span>
                    <span>FFmpeg Pipeline</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                    <FileVideo className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Upload Game Cutscene Video
                    </h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                      Drag and drop your cutscene video file here, or click to browse.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <span className="px-3 py-1 rounded-full text-xs font-mono bg-studio-700 text-slate-300 border border-studio-600">
                      MP4 / MOV
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-mono bg-studio-700 text-slate-300 border border-studio-600">
                      Up to 150MB
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-mono bg-studio-700 text-slate-300 border border-studio-600">
                      FFmpeg 48kHz Extract
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Pipeline Explanation for Students */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded-xl bg-studio-800/80 border border-studio-700">
                <div className="flex items-center gap-2 text-indigo-400 mb-1">
                  <Film className="w-4 h-4" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">1. Probe Stream</h4>
                </div>
                <p className="text-xs text-slate-400">
                  Runs <code className="text-indigo-300">ffprobe</code> to read resolution, duration, frame rate, and detect audio streams.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-studio-800/80 border border-studio-700">
                <div className="flex items-center gap-2 text-indigo-400 mb-1">
                  <Music className="w-4 h-4" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">2. Extract Audio</h4>
                </div>
                <p className="text-xs text-slate-400">
                  Separates the dialogue audio into 48kHz 16-bit mono PCM WAV for Gnani Speech-to-Text.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-studio-800/80 border border-studio-700">
                <div className="flex items-center gap-2 text-indigo-400 mb-1">
                  <Layers className="w-4 h-4" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">3. Sample Frames</h4>
                </div>
                <p className="text-xs text-slate-400">
                  Generates poster thumbnails and representative keyframes for Gemini visual scene analysis.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Studio Active Workspace (When video is processed & ready) */}
        {project.has_video && !isUploading && (
          activeStudioTab === 'analysis' ? (
            <SceneAnalysisPanel
              project={project}
              onProjectUpdated={onProjectUpdated}
            />
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Video Player & Audio Preview (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Video Player Card */}
              <div className="rounded-2xl bg-studio-800 border border-studio-700 overflow-hidden shadow-2xl">
                <div className="px-4 py-3 bg-studio-750 border-b border-studio-700 flex items-center justify-between text-xs text-slate-300">
                  <span className="font-medium flex items-center gap-2">
                    <Film className="w-4 h-4 text-indigo-400" />
                    <span>Cutscene Video Preview</span>
                  </span>
                  <span className="font-mono text-slate-400">
                    {project.video_filename}
                  </span>
                </div>

                <div className="relative bg-black aspect-video flex items-center justify-center">
                  <video
                    src={project.video_url}
                    poster={project.thumbnail_url}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Extracted Audio Track Preview Card */}
              <div className="rounded-2xl bg-studio-800 border border-studio-700 p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {project.has_audio ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Extracted Audio Track</h4>
                      <p className="text-xs text-slate-400">
                        {project.has_audio 
                          ? 'Isolated cutscene audio stem extracted by FFmpeg' 
                          : 'Silent cutscene — ready for AI voiceover creation'}
                      </p>
                    </div>
                  </div>

                  {project.has_audio ? (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      48kHz Mono WAV
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Silent Cutscene
                    </span>
                  )}
                </div>

                {project.has_audio && project.audio_url ? (
                  <div className="bg-studio-900/80 p-3 rounded-xl border border-studio-700">
                    <audio
                      src={project.audio_url}
                      controls
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-studio-750 border border-studio-700 text-xs text-slate-300">
                    ℹ️ This cutscene has no audio track. In Phase 4, you can compose dialogue and assign AI character voices to dub it from scratch!
                  </div>
                )}
              </div>

              {/* Next Step Banner (Phase 3 AI Scene Understanding) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-violet-900/30 border border-indigo-500/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">Phase 3: AI Scene Understanding</h5>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {project.scene_analysis 
                        ? `Identified ${project.scene_analysis.characters.length} characters & ${project.scene_analysis.scenes.length} scene segments.` 
                        : `Gemini Vision AI can analyze these ${project.frames_count} frames to identify characters, actions, and settings.`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveStudioTab('analysis')}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition flex-shrink-0 shadow-lg shadow-indigo-600/30"
                >
                  <span>{project.scene_analysis ? 'View Analysis' : 'Start Analysis'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Column: Metadata & Representative Frames Gallery (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Technical Metadata Panel */}
              <div className="rounded-2xl bg-studio-800 border border-studio-700 p-5 space-y-4 shadow-lg">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Technical Metadata</span>
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-studio-900/60 border border-studio-700/60">
                    <span className="text-slate-400 block text-[11px]">Duration</span>
                    <span className="text-white font-mono font-semibold text-sm">
                      {formatDuration(project.duration)} <span className="text-slate-400 text-xs">({project.duration}s)</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-studio-900/60 border border-studio-700/60">
                    <span className="text-slate-400 block text-[11px]">Resolution</span>
                    <span className="text-white font-mono font-semibold text-sm">
                      {project.width} × {project.height}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-studio-900/60 border border-studio-700/60">
                    <span className="text-slate-400 block text-[11px]">Frame Rate</span>
                    <span className="text-white font-mono font-semibold text-sm">
                      {project.fps} fps
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-studio-900/60 border border-studio-700/60">
                    <span className="text-slate-400 block text-[11px]">File Size</span>
                    <span className="text-white font-mono font-semibold text-sm">
                      {formatBytes(project.video_size_bytes)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Representative Frames Gallery */}
              <div className="rounded-2xl bg-studio-800 border border-studio-700 p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Extracted Frames ({project.frames_count})</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Sampled for VLM Analysis
                  </span>
                </div>

                {project.frame_urls.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {project.frame_urls.map((frameUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewFrame(frameUrl)}
                        className="group relative rounded-lg overflow-hidden border border-studio-700 bg-studio-900 aspect-video cursor-pointer hover:border-indigo-500 transition-all shadow"
                      >
                        <img
                          src={frameUrl}
                          alt={`Frame ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 className="w-4 h-4 text-white" />
                        </div>
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] font-mono bg-black/70 text-slate-300">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No frames extracted.</p>
                )}
              </div>
            </div>
          </div>
          )
        )}
      </div>

      {/* Frame Full-screen Modal */}
      {previewFrame && (
        <div 
          onClick={() => setPreviewFrame(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden border border-studio-700 shadow-2xl">
            <button
              onClick={() => setPreviewFrame(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewFrame}
              alt="Full Preview Frame"
              className="max-h-[85vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
