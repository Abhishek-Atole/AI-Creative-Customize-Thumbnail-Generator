import React, { useState, useCallback } from 'react';
import { generateBanner, editBanner } from '../services/geminiService';
import { ASPECT_RATIOS, EDITING_FILTERS } from '../constants';
import type { AspectRatio } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { DownloadIcon, GenerateIcon, ErrorIcon, UploadIcon, EditIcon, FilterIcon } from './Icon';

const aspectRatioStyles: { [key: string]: string } = {
  '16:9': 'aspect-[16/9]',
  '9:16': 'aspect-[9/16]',
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '3:4': 'aspect-[3/4]',
};

export const BannerGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>(ASPECT_RATIOS[0].value);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState<boolean>(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [personImage, setPersonImage] = useState<string | null>(null);

  const [useDeepResearch, setUseDeepResearch] = useState<boolean>(false);
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);


  const getYoutubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const fetchImageAsBase64 = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Initial thumbnail fetch failed');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        const fallbackUrl = url.replace('maxresdefault.jpg', 'hqdefault.jpg');
        const fallbackResponse = await fetch(fallbackUrl);
        if (!fallbackResponse.ok) {
            throw new Error('Could not fetch thumbnail image, even with fallback.');
        }
        const blob = await fallbackResponse.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
  };

  const handleFetchThumbnail = useCallback(async () => {
    const videoId = getYoutubeVideoId(youtubeUrl);
    if (!videoId) {
        setError('Invalid YouTube URL. Please check the link and try again.');
        return;
    }

    setIsFetchingThumbnail(true);
    setError(null);
    setReferenceImage(null);

    try {
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        const base64Image = await fetchImageAsBase64(thumbnailUrl);
        setReferenceImage(base64Image);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch thumbnail.');
    } finally {
        setIsFetchingThumbnail(false);
    }
  }, [youtubeUrl]);

  const handlePersonImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPersonImage(reader.result as string);
      };
      reader.onerror = () => {
        setError('Failed to read the person image file.');
      };
      reader.readAsDataURL(file);
    } else if (file) {
      setError('Please upload a valid image file (JPEG or PNG).');
    }
  };

  const handleGenerate = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt || isLoading) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setEditPrompt('');

    try {
      const imageUrl = await generateBanner(prompt, aspectRatio, useDeepResearch, referenceImage, personImage);
      setGeneratedImage(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, aspectRatio, isLoading, referenceImage, personImage, useDeepResearch]);
  
  const handleEditRequest = useCallback(async (editInstruction: string) => {
    if (!editInstruction || !generatedImage || isEditing) return;

    setIsEditing(true);
    setError(null);

    try {
      const imageUrl = await editBanner(generatedImage, editInstruction);
      setGeneratedImage(imageUrl);
      setEditPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during edit.');
    } finally {
      setIsEditing(false);
    }
  }, [generatedImage, isEditing]);

  const handleCustomEditSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleEditRequest(editPrompt);
  };


  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `ai-banner-${prompt.substring(0, 20).replace(/\s/g, '_')}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl p-6 md:p-8">
      <form onSubmit={handleGenerate}>
        <div className="space-y-6">
          <div>
            <label htmlFor="youtube_url" className="block text-lg font-semibold mb-2 text-gray-200">
              1. (Optional) Get Inspiration
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="youtube_url"
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste a competitor's YouTube video link"
                className="flex-grow p-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-200 placeholder-gray-500"
              />
              <button
                type="button"
                onClick={handleFetchThumbnail}
                disabled={!youtubeUrl || isFetchingThumbnail}
                className="flex-shrink-0 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingThumbnail ? <LoadingSpinner className="w-5 h-5" /> : 'Fetch Thumbnail'}
              </button>
            </div>
            {referenceImage && (
              <div className="mt-4">
                <div className="relative group w-fit">
                    <img src={referenceImage} alt="YouTube Thumbnail" className="rounded-lg max-w-[240px] border-2 border-indigo-500" />
                    <button
                        type="button"
                        onClick={() => { setReferenceImage(null); setYoutubeUrl(''); }}
                        className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                        aria-label="Remove reference image"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="prompt" className="block text-lg font-semibold mb-2 text-gray-200">
              2. Describe your banner
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A majestic lion wearing a crown, on a dark throne, cinematic lighting"
              className="w-full h-24 p-4 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none text-gray-200 placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label htmlFor="person_upload_button" className="block text-lg font-semibold mb-2 text-gray-200">
              3. (Optional) Feature a specific person
            </label>
            <div className="flex items-center gap-4">
              <input
                id="person_upload"
                type="file"
                accept="image/png, image/jpeg"
                onChange={handlePersonImageUpload}
                className="hidden"
              />
              <label htmlFor="person_upload" id="person_upload_button" className="flex-shrink-0 flex items-center gap-2 cursor-pointer bg-gray-700 hover:bg-gray-600 text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-300">
                <UploadIcon className="w-5 h-5" />
                <span>Upload Image</span>
              </label>
              {personImage && (
                <div className="relative group w-fit">
                  <img src={personImage} alt="Person to feature" className="rounded-lg h-16 w-16 object-cover border-2 border-indigo-500" />
                  <button
                    type="button"
                    onClick={() => { setPersonImage(null); (document.getElementById('person_upload') as HTMLInputElement).value = ''; }}
                    className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                    aria-label="Remove person image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
              <label className="block text-lg font-semibold mb-3 text-gray-200">
                  4. Choose Aspect Ratio
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {ASPECT_RATIOS.map((ratio: AspectRatio) => (
                      <button
                          key={ratio.value}
                          type="button"
                          onClick={() => setAspectRatio(ratio.value)}
                          className={`flex flex-col items-center justify-center gap-2 p-3 border rounded-lg transition-all duration-200 transform hover:-translate-y-1 ${
                              aspectRatio === ratio.value 
                                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                                  : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700 hover:border-gray-500'
                          }`}
                      >
                          {ratio.icon}
                          <span className="text-sm font-medium">{ratio.label}</span>
                          <span className="text-xs text-gray-400">{ratio.value}</span>
                      </button>
                  ))}
              </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center space-x-3 bg-gray-900/50 p-3 rounded-lg">
                <label htmlFor="deep-research-toggle" className="font-semibold text-gray-200 whitespace-nowrap">Deep Research</label>
                <button
                    type="button"
                    role="switch"
                    aria-checked={useDeepResearch}
                    onClick={() => setUseDeepResearch(!useDeepResearch)}
                    className={`${useDeepResearch ? 'bg-indigo-600' : 'bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                    id="deep-research-toggle"
                >
                    <span className={`${useDeepResearch ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                </button>
            </div>
            <button
              type="submit"
              disabled={isLoading || !prompt}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="w-6 h-6" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <GenerateIcon className="w-6 h-6" />
                  <span>Generate Banner</span>
                </>
              )}
            </button>
        </div>
      </form>
      
      <div className="mt-8 w-full">
        <div className={`relative w-full bg-gray-900/50 border border-dashed border-gray-700 rounded-lg flex items-center justify-center transition-all duration-300 ease-in-out overflow-hidden ${aspectRatioStyles[aspectRatio]} ${generatedImage ? 'p-0 border-solid' : 'p-4 min-h-[250px]'}`}>
            {(isLoading || isEditing) && (
              <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center text-gray-400">
                  <LoadingSpinner className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">{isEditing ? 'Applying your edits...' : 'AI is crafting your vision...'}</p>
                  <p className="text-sm">This can take a moment.</p>
                </div>
              </div>
            )}
            {error && (
                <div className="text-center text-red-400 p-4">
                    <ErrorIcon className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-lg font-bold">Operation Failed</p>
                    <p className="text-sm max-w-md mx-auto">{error}</p>
                </div>
            )}
            {generatedImage && (
                <img src={generatedImage} alt="Generated Banner" className="w-full h-full object-cover shadow-2xl" />
            )}
            {!isLoading && !error && !generatedImage && (
              <div className="text-center text-gray-500">
                <p>Your generated banner will appear here.</p>
              </div>
            )}
        </div>
        
        {generatedImage && !isLoading && (
            <div className="mt-6 space-y-6">
                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                    <label className="flex items-center gap-2 text-lg font-semibold mb-3 text-gray-200">
                        <FilterIcon className="w-5 h-5" />
                        Quick Filters
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {EDITING_FILTERS.map(filter => (
                            <button
                                key={filter.name}
                                type="button"
                                onClick={() => handleEditRequest(filter.prompt)}
                                disabled={isEditing}
                                className="w-full text-center p-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
                            >
                                {filter.name}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleCustomEditSubmit} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                    <label htmlFor="edit_prompt" className="flex items-center gap-2 text-lg font-semibold mb-2 text-gray-200">
                        <EditIcon className="w-5 h-5" />
                        Custom Creative Editing
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            id="edit_prompt"
                            type="text"
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="e.g., Make it black and white, add a retro filter..."
                            className="flex-grow p-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            type="submit"
                            disabled={isEditing || !editPrompt}
                            className="flex-shrink-0 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <span>Apply Edit</span>
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <button
                        onClick={handleDownload}
                        className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg mx-auto"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        <span>Download Banner</span>
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};