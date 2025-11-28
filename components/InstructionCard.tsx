import React from 'react';
import { Image as ImageIcon, Link, Video } from 'lucide-react';

export const InstructionCard: React.FC = () => {
  return (
    <div className="bg-spotify-dark p-6 rounded-xl border border-spotify-grey/30 mb-8">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="bg-spotify-green text-black w-6 h-6 rounded-full flex items-center justify-center text-xs">!</span>
        歌单太长怎么办? (Solution for large playlists)
      </h2>
      <div className="grid md:grid-cols-3 gap-4 text-spotify-light text-sm">
        
        {/* Method A: Screen Recording */}
        <div className="flex flex-col gap-2 bg-spotify-grey/10 p-4 rounded-lg border border-spotify-green/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-spotify-green text-black text-[10px] font-bold px-2 py-0.5 rounded-bl">推荐</div>
          <div className="font-semibold text-white flex items-center gap-2 text-lg">
            <Video size={20} className="text-spotify-green" /> 录屏识别 (最快)
          </div>
          <ol className="list-decimal list-inside space-y-2 mt-2">
            <li>在手机或电脑上开启<strong>屏幕录制</strong>。</li>
            <li>打开酷狗歌单，<strong>缓慢匀速</strong>向下滚动到底部。</li>
            <li>停止录制并点击下方的 <strong>"上传录屏"</strong>。</li>
            <li>系统将自动从视频中提取画面进行识别。</li>
          </ol>
        </div>

        {/* Method B: Screenshots */}
        <div className="flex flex-col gap-2 bg-spotify-grey/10 p-4 rounded-lg">
          <div className="font-semibold text-white flex items-center gap-2 text-lg">
            <ImageIcon size={20} className="text-spotify-green" /> 普通截图 / 长截图
          </div>
          <ol className="list-decimal list-inside space-y-2 mt-2">
            <li>使用手机的<strong>"滚动长截图"</strong>功能。</li>
            <li>或者手动截取多张图片 (支持批量上传)。</li>
            <li>点击 <strong>"上传截图"</strong> 按钮。</li>
          </ol>
        </div>

        {/* Method C: Share Link */}
        <div className="flex flex-col gap-2 bg-spotify-grey/10 p-4 rounded-lg">
          <div className="font-semibold text-white flex items-center gap-2 text-lg">
            <Link size={20} className="text-spotify-green" /> 复制分享链接
          </div>
          <ol className="list-decimal list-inside space-y-2 mt-2">
            <li>酷狗APP点击分享 -> 复制链接。</li>
            <li>在电脑浏览器打开。</li>
            <li>全选复制文字，粘贴到文本框。</li>
          </ol>
        </div>

      </div>
    </div>
  );
};