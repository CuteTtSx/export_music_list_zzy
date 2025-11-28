import React from 'react';
import { SongEntry } from '../types';
import { Trash2 } from 'lucide-react';

interface SongRowProps {
  entry: SongEntry;
  index: number;
  onDelete: (index: number) => void;
  onChange: (index: number, field: keyof SongEntry, value: string) => void;
}

export const SongRow: React.FC<SongRowProps> = ({ entry, index, onDelete, onChange }) => {
  return (
    <div className="group flex items-center gap-3 bg-spotify-dark/50 hover:bg-spotify-grey/20 p-3 rounded-md transition-colors border border-transparent hover:border-spotify-grey/30">
      <span className="text-spotify-light font-mono text-sm w-8 text-center">{index + 1}</span>
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
        <input
          type="text"
          value={entry.songName}
          onChange={(e) => onChange(index, 'songName', e.target.value)}
          className="bg-transparent border-b border-spotify-grey/50 focus:border-spotify-green outline-none text-white px-1 py-1 placeholder-gray-600"
          placeholder="Song Name"
        />
        <input
          type="text"
          value={entry.artistName}
          onChange={(e) => onChange(index, 'artistName', e.target.value)}
          className="bg-transparent border-b border-spotify-grey/50 focus:border-spotify-green outline-none text-spotify-light px-1 py-1 placeholder-gray-600"
          placeholder="Artist Name"
        />
      </div>

      <button
        onClick={() => onDelete(index)}
        className="text-gray-500 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remove song"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};