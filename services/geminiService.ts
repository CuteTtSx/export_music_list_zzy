import { GoogleGenAI } from "@google/genai";
import { SongEntry } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

export interface ExtractionInput {
  text: string;
  images: {
    mimeType: string;
    data: string; // base64
  }[];
}

export const extractSongs = async (input: ExtractionInput): Promise<SongEntry[]> => {
  const ai = getAiClient();
  
  // gemini-2.5-flash handles multimodal input (text + images) efficiently
  const modelId = "gemini-2.5-flash";

  const hasImages = input.images.length > 0;

  const textPrompt = `
    You are a data extraction assistant. 
    ${hasImages ? "I have provided a series of images. These are frames extracted from a video recording of someone scrolling through a Kugou Music playlist." : "I have provided text copied from a music playlist."}
    ${input.text ? "I have also provided some raw text." : ""}

    Your task is to extract a list of songs and their artists from the provided content.
    
    CRITICAL INSTRUCTIONS FOR VIDEO FRAMES:
    1. Because the images are video frames, there is SIGNIFICANT OVERLAP between images. The same song will appear in multiple consecutive images.
    2. You MUST deduplicate the songs. If "Song A - Artist B" appears in Image 1, Image 2, and Image 3, only list it ONCE in the final output.
    3. Maintain the relative order of songs as they appear in the scrolling list, but prioritize uniqueness.
    
    OUTPUT FORMAT INSTRUCTIONS (STRICT):
    1. Return ONLY the song data in plain text format. 
    2. Each line must represent one song.
    3. Use " ||| " as the separator between Song Name and Artist Name.
    4. Format: Song Name ||| Artist Name
    5. Do not include numbering, bullet points, or any other formatting.
    6. Do not include markdown code blocks (like \`\`\`text). Just raw text.
    7. Example output:
       Shape of You ||| Ed Sheeran
       Blinding Lights ||| The Weeknd
       Bad Guy ||| Billie Eilish

    General Rules:
    1. Identify the song title and the artist name.
    2. Ignore generic text like "Play", "Download", "Duration", "Share", "SQ", "HQ", UI elements, timestamps, or lyrics.
    3. If the artist is not explicitly clear, try to infer it from the context (e.g. "Song - Artist").
    4. Clean up any extra whitespace or special characters.
  `;

  // Construct parts
  const parts: any[] = [{ text: textPrompt }];

  // Add text content if present
  if (input.text) {
    parts.push({ text: `Input Text Data:\n"""${input.text.substring(0, 30000)}"""` });
  }

  // Add image parts
  input.images.forEach((img) => {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data
      }
    });
  });

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      // Removed responseSchema/JSON enforcement to allow for longer output (text is more token efficient)
    });

    const rawText = response.text || "";
    
    if (!rawText) {
      throw new Error("No data returned from AI");
    }

    // Parse the custom text format
    const songs: SongEntry[] = rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.includes('|||'))
      .map(line => {
        const [songName, artistName] = line.split('|||').map(s => s.trim());
        return {
          songName: songName || "Unknown Song",
          artistName: artistName || "Unknown Artist"
        };
      });
      
    // Final client-side dedupe just in case
    const uniqueSongs: SongEntry[] = [];
    const seen = new Set<string>();
    
    for (const song of songs) {
      const key = `${song.songName.toLowerCase()}-${song.artistName.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSongs.push(song);
      }
    }

    return uniqueSongs;

  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Failed to extract songs. Please check your inputs and try again.");
  }
};