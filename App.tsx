import React, { useState, useCallback, useRef } from 'react';
import { extractSongs } from './services/geminiService';
import { SongEntry, ProcessingStatus } from './types';
import { InstructionCard } from './components/InstructionCard';
import { SongRow } from './components/SongRow';
import { Music, Download, Wand2, RefreshCw, Trash, AlertCircle, Image as ImageIcon, X, Video, Film } from 'lucide-react';

interface ImageAttachment {
  id: string;
  file?: File; // Optional now as frames don't have original files
  previewUrl: string;
  base64: string;
  source: 'upload' | 'video_frame';
}

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [songs, setSongs] = useState<SongEntry[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processingVideo, setProcessingVideo] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Handle standard image uploads
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages: ImageAttachment[] = [];
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (!file.type.startsWith('image/')) continue;

        try {
          const base64 = await convertFileToBase64(file);
          const cleanBase64 = base64.split(',')[1];
          
          newImages.push({
            id: Math.random().toString(36).substring(7),
            file,
            previewUrl: URL.createObjectURL(file),
            base64: cleanBase64,
            source: 'upload'
          });
        } catch (err) {
          console.error("Error reading file", err);
        }
      }
      
      setImages(prev => [...prev, ...newImages]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setErrorMsg(null);
    }
  };

  // Handle Video Upload and Frame Extraction
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingVideo(true);
    setVideoProgress("Initializing video processing...");
    setErrorMsg(null);

    try {
      const frames = await extractFramesFromVideo(file);
      const newImages: ImageAttachment[] = frames.map((frame, index) => ({
        id: `frame-${Date.now()}-${index}`,
        previewUrl: frame.dataUrl,
        base64: frame.base64,
        source: 'video_frame'
      }));

      setImages(prev => [...prev, ...newImages]);
      setVideoProgress("");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to process video: " + err.message);
    } finally {
      setProcessingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const extractFramesFromVideo = (videoFile: File): Promise<{dataUrl: string, base64: string}[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      const objectUrl = URL.createObjectURL(videoFile);
      video.src = objectUrl;

      const frames: {dataUrl: string, base64: string}[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = async () => {
        const duration = video.duration;
        // Capture every 2.0 seconds. 
        // For a 5 min video (300s), this results in ~150 frames.
        // We need fewer frames if we are keeping full resolution to avoid payload limits.
        const interval = 2.0; 
        let currentTime = 0;
        // Increase maxFrames to 300 to support longer videos (up to 10 mins at 2s interval)
        const maxFrames = 300;
        
        // Use original video dimensions for maximum OCR accuracy
        // DO NOT DOWNSCALE
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const processFrame = () => {
          if (currentTime > duration || frames.length >= maxFrames) {
            URL.revokeObjectURL(objectUrl);
            resolve(frames);
            return;
          }

          const pct = Math.min(100, Math.round((currentTime / duration) * 100));
          setVideoProgress(`Extracting frames: ${pct}% (${frames.length} captured)`);
          
          video.currentTime = currentTime;
        };

        video.onseeked = () => {
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Use high quality (0.85) to ensure text is sharp, but slight compression to manage size
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            const base64 = dataUrl.split(',')[1];
            frames.push({ dataUrl, base64 });
          }
          currentTime += interval;
          processFrame();
        };

        video.onerror = (e) => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Error playing video for extraction."));
        };

        // Start processing
        processFrame();
      };

      video.onerror = () => {
         reject(new Error("Could not load video file."));
      };
    });
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target && target.source === 'upload') URL.revokeObjectURL(target.previewUrl);
      return prev.filter(img => img.id !== id);
    });
  };

  const handleExtract = async () => {
    if (!inputText.trim() && images.length === 0) {
      setErrorMsg("请粘贴文本、上传截图或上传录屏视频。");
      return;
    }

    setStatus(ProcessingStatus.PROCESSING);
    setErrorMsg(null);

    try {
      const extractedSongs = await extractSongs({
        text: inputText,
        images: images.map(img => ({
          mimeType: 'image/jpeg',
          data: img.base64
        }))
      });

      if (extractedSongs.length === 0) {
        setErrorMsg("未能识别到任何歌曲，请确保提供了清晰的歌单内容。");
        setStatus(ProcessingStatus.ERROR);
      } else {
        setSongs(extractedSongs);
        setStatus(ProcessingStatus.SUCCESS);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong during extraction.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleDeleteSong = useCallback((index: number) => {
    setSongs(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleEditSong = useCallback((index: number, field: keyof SongEntry, value: string) => {
    setSongs(prev => {
      const newSongs = [...prev];
      newSongs[index] = { ...newSongs[index], [field]: value };
      return newSongs;
    });
  }, []);

  const handleReset = () => {
    setInputText('');
    setImages(prev => {
      prev.forEach(img => {
        if (img.source === 'upload') URL.revokeObjectURL(img.previewUrl);
      });
      return [];
    });
    setSongs([]);
    setStatus(ProcessingStatus.IDLE);
    setErrorMsg(null);
  };

  const handleDownload = () => {
    if (songs.length === 0) return;

    const fileContent = songs
      .map(s => `${s.songName} - ${s.artistName}`)
      .join('\n');

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kugou_playlist_export.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <Music className="text-spotify-green" size={48} />
            <span className="text-white">Kugou</span>
            <span className="text-gray-500 text-2xl">to</span>
            <span className="text-spotify-green">Spotify</span>
          </h1>
          <p className="text-spotify-light">
            Export 600+ songs easily via Text, Screenshots, or Screen Recording
          </p>
        </header>

        <InstructionCard />

        {/* Input Section */}
        {status === ProcessingStatus.IDLE || status === ProcessingStatus.ERROR ? (
          <div className="space-y-6 animate-fade-in">
            
            {/* Input Container */}
            <div className="bg-spotify-dark border border-spotify-grey/30 rounded-xl p-4 md:p-6 space-y-6">
              
              {/* Media Upload Area */}
              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-white flex items-center gap-2">
                       <ImageIcon size={18} /> 
                       媒体上传 (Screenshots / Video)
                    </label>
                    <span className="text-xs text-gray-500">{images.length} frames ready</span>
                 </div>

                 <div className="flex flex-wrap gap-3">
                    {/* Video Upload Button */}
                    <button 
                      onClick={() => videoInputRef.current?.click()}
                      disabled={processingVideo}
                      className="w-32 h-24 flex flex-col items-center justify-center border-2 border-dashed border-spotify-green/50 hover:border-spotify-green rounded-lg bg-spotify-green/10 hover:bg-spotify-green/20 transition-all text-spotify-green hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingVideo ? (
                        <RefreshCw size={24} className="mb-1 animate-spin" />
                      ) : (
                        <Video size={24} className="mb-1" />
                      )}
                      <span className="text-xs font-bold">{processingVideo ? 'Processing...' : 'Upload Video'}</span>
                      <span className="text-[10px] opacity-70">录屏 (推荐)</span>
                    </button>
                    <input 
                      type="file" 
                      ref={videoInputRef} 
                      className="hidden" 
                      accept="video/mp4,video/quicktime,video/webm" 
                      onChange={handleVideoSelect}
                    />

                    {/* Image Upload Button */}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={processingVideo}
                      className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-spotify-grey hover:border-spotify-green rounded-lg bg-spotify-grey/10 hover:bg-spotify-grey/20 transition-all text-gray-400 hover:text-white"
                    >
                      <ImageIcon size={24} className="mb-1" />
                      <span className="text-xs">Add Images</span>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      multiple 
                      onChange={handleFileSelect}
                    />

                    {/* Previews */}
                    {images.map((img) => (
                      <div key={img.id} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-spotify-grey/50 bg-black">
                        <img src={img.previewUrl} alt="preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                        {img.source === 'video_frame' && (
                          <div className="absolute bottom-0 right-0 p-0.5 bg-black/60 text-white rounded-tl">
                            <Film size={10} />
                          </div>
                        )}
                        <button 
                          onClick={() => removeImage(img.id)}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                 </div>
                 
                 {processingVideo && (
                   <div className="text-xs text-spotify-green animate-pulse">
                     {videoProgress}
                   </div>
                 )}
              </div>

              {/* Text Input Divider */}
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-spotify-grey/30"></div>
                <span className="flex-shrink-0 mx-4 text-spotify-grey text-xs">OR PASTE TEXT</span>
                <div className="flex-grow border-t border-spotify-grey/30"></div>
              </div>

              {/* Text Input */}
              <div className="relative">
                <textarea
                  className="w-full h-24 bg-black/40 border border-spotify-grey/30 rounded-lg p-4 text-sm font-mono text-spotify-light focus:outline-none focus:border-spotify-green focus:ring-1 focus:ring-spotify-green transition-all resize-y"
                  placeholder="Paste raw text here if you have it..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

            </div>

            {errorMsg && (
              <div className="bg-red-900/30 border border-red-800/50 text-red-200 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle size={18} />
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleExtract}
                disabled={processingVideo || (!inputText.trim() && images.length === 0)}
                className={`px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 ${
                  (processingVideo || (!inputText.trim() && images.length === 0))
                    ? 'bg-spotify-grey text-gray-400 cursor-not-allowed'
                    : 'bg-spotify-green text-black hover:bg-green-400 shadow-[0_0_20px_rgba(29,185,84,0.3)]'
                }`}
              >
                <Wand2 size={20} /> 开始识别 (Analyze)
              </button>
            </div>
          </div>
        ) : null}

        {/* Loading State Overlay */}
        {status === ProcessingStatus.PROCESSING && (
           <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
             <div className="animate-spin text-spotify-green mb-4">
                <RefreshCw size={48} />
             </div>
             <h3 className="text-xl font-bold text-white">Gemini is watching...</h3>
             <p className="text-gray-400 mt-2 max-w-md text-center">
               Analyzing {images.length > 0 ? `${images.length} frames` : 'text content'} to extract your songs.
               <br/>
               <span className="text-xs text-spotify-green mt-1 block">For 600+ songs, this might take 30-60 seconds. Please wait.</span>
             </p>
           </div>
        )}

        {/* Results Section */}
        {status === ProcessingStatus.SUCCESS && (
          <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center border-b border-spotify-grey/30 pb-4 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">提取结果 (Results)</h2>
                <p className="text-spotify-light text-sm mt-1">Found {songs.length} songs. Please review before exporting.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-full border border-gray-600 text-gray-300 hover:border-white hover:text-white transition-all flex items-center gap-2 text-sm"
                >
                  <Trash size={16} /> Start Over
                </button>
                <button
                  onClick={handleDownload}
                  className="px-6 py-2 rounded-full bg-spotify-green text-black font-bold hover:bg-green-400 transition-all flex items-center gap-2 shadow-lg hover:shadow-green-500/20"
                >
                  <Download size={18} /> Export .txt
                </button>
              </div>
            </div>

            <div className="bg-spotify-dark rounded-xl border border-spotify-grey/20 overflow-hidden">
               <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2 custom-scrollbar">
                 {songs.map((song, idx) => (
                   <SongRow 
                      key={idx} 
                      index={idx} 
                      entry={song} 
                      onDelete={handleDeleteSong} 
                      onChange={handleEditSong} 
                   />
                 ))}
               </div>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg text-sm text-blue-200">
               <strong>Next Step:</strong> Go to <a href="https://tunemymusic.com" target="_blank" rel="noreferrer" className="underline hover:text-white">TuneMyMusic.com</a>, select "Upload File" as source, upload the generated <code>.txt</code> file, and select Spotify as destination.
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;