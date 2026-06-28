import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, X, Smile, Image } from 'lucide-react';
import { FALLBACK_STICKERS, FALLBACK_GIFS } from '../utils/fallbackMedia';

// Popular sticker search categories for browsing
const STICKER_CATEGORIES = [
  { label: '😊 Happy', query: 'happy' },
  { label: '❤️ Love', query: 'love' },
  { label: '😂 Laugh', query: 'laughing' },
  { label: '👋 Hi', query: 'hello hi' },
  { label: '😢 Sad', query: 'sad crying' },
  { label: '😡 Angry', query: 'angry' },
  { label: '🎉 Party', query: 'celebration party' },
  { label: '👍 Yes', query: 'thumbs up yes' },
  { label: '👎 No', query: 'no nope' },
  { label: '🙏 Thanks', query: 'thank you thanks' },
  { label: '😴 Sleep', query: 'sleepy tired' },
  { label: '🤔 Think', query: 'thinking hmm' },
  { label: '🐱 Cats', query: 'cute cat' },
  { label: '🐶 Dogs', query: 'cute dog' },
  { label: '🌹 Flowers', query: 'flowers roses' },
  { label: '💪 Strong', query: 'strong power' },
  { label: '🔥 Fire', query: 'fire lit' },
  { label: '✨ Magic', query: 'sparkle magic' },
  { label: '😘 Kiss', query: 'kiss blowing kiss' },
  { label: '🤗 Hug', query: 'hug hugging' },
];

// Local search and filter engine for curated static fallback
const getFallbackItems = (query, type, categoryQuery = '') => {
  const source = type === 'stickers' ? FALLBACK_STICKERS : FALLBACK_GIFS;
  if (!query || !query.trim()) {
    if (type === 'stickers' && categoryQuery) {
      const catKeywords = categoryQuery.toLowerCase().split(' ');
      return source.filter(item => 
        item.tags.some(tag => catKeywords.some(kw => tag.includes(kw)))
      );
    }
    return source.slice(0, 30);
  }
  
  const searchKeywords = query.toLowerCase().trim().split(/\s+/);
  return source.filter(item => {
    const titleMatch = searchKeywords.every(kw => item.title.toLowerCase().includes(kw));
    const tagMatch = searchKeywords.every(kw => 
      item.tags.some(tag => tag.toLowerCase().includes(kw))
    );
    return titleMatch || tagMatch;
  });
};

export default function StickerGifPicker({ onSelectGif, onSelectSticker, onClose }) {
  const [activeTab, setActiveTab] = useState('stickers');
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const debounceRef = useRef(null);

  // Fetch from Giphy / Tenor APIs with Resilient Curated Fallback
  const fetchMedia = useCallback(async (query, type = 'gifs') => {
    setLoading(true);
    const isSticker = type === 'stickers';
    const categoryQuery = isSticker ? STICKER_CATEGORIES[activeCategory]?.query : '';
    
    // Read developer API keys from Vite environment config
    const tenorKey = import.meta.env.VITE_TENOR_API_KEY || '';
    const giphyKey = import.meta.env.VITE_GIPHY_API_KEY || '';

    // Ignore known invalid/banned/disabled legacy keys
    const isInvalidTenor = !tenorKey || tenorKey === 'AIzaSyBFbOHSRkuTaIynbOkFPNR0rR7sc4cLUa4';
    const isInvalidGiphy = !giphyKey || giphyKey === 'LIVDSRZtEYv8HVC5Hp3Ih2GC1yfyCGoH' || giphyKey === 'dc6zaTOxFJmzC';

    if (isInvalidTenor && isInvalidGiphy) {
      // Instantly fallback to curated static library
      const localItems = getFallbackItems(query, type, categoryQuery);
      setItems(localItems);
      setLoading(false);
      return;
    }

    try {
      let formatted = [];
      if (giphyKey && !isInvalidGiphy) {
        // Query Giphy API
        let url;
        if (query && query.trim()) {
          url = `https://api.giphy.com/v1/${isSticker ? 'stickers' : 'gifs'}/search?api_key=${giphyKey}&q=${encodeURIComponent(query)}&limit=30&rating=g`;
        } else {
          url = `https://api.giphy.com/v1/${isSticker ? 'stickers' : 'gifs'}/trending?api_key=${giphyKey}&limit=30&rating=g`;
        }
        
        const response = await fetch(url);
        if (response.status === 200) {
          const result = await response.json();
          if (result.data) {
            formatted = result.data.map(item => ({
              id: item.id,
              title: item.title || '',
              url: item.images?.fixed_width?.url || '',
              preview: item.images?.fixed_width_small?.url || item.images?.fixed_width?.url || ''
            })).filter(g => g.url && g.preview);
          }
        } else {
          throw new Error(`Giphy API responded with status ${response.status}`);
        }
      } else if (tenorKey && !isInvalidTenor) {
        // Query Tenor API
        const stickerFilter = isSticker ? '&searchfilter=sticker' : '';
        let url;
        if (query && query.trim()) {
          url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${tenorKey}&client_key=chatting_app&limit=30&media_filter=gif,tinygif${stickerFilter}`;
        } else {
          url = `https://tenor.googleapis.com/v2/featured?key=${tenorKey}&client_key=chatting_app&limit=30&media_filter=gif,tinygif${stickerFilter}`;
        }

        const response = await fetch(url);
        if (response.status === 200) {
          const result = await response.json();
          if (result.results) {
            formatted = result.results.map(item => ({
              id: item.id,
              title: item.title || item.content_description || '',
              url: item.media_formats?.gif?.url || item.media_formats?.mediumgif?.url || '',
              preview: item.media_formats?.tinygif?.url || item.media_formats?.gif?.url || ''
            })).filter(g => g.url && g.preview);
          }
        } else {
          throw new Error(`Tenor API responded with status ${response.status}`);
        }
      }

      if (formatted.length > 0) {
        setItems(formatted);
      } else {
        // Fallback if API returned empty arrays
        setItems(getFallbackItems(query, type, categoryQuery));
      }
    } catch (error) {
      console.warn('API media fetch failed, falling back to local library:', error);
      setItems(getFallbackItems(query, type, categoryQuery));
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  // Load initial content or react to tab/category changes
  useEffect(() => {
    const type = activeTab === 'stickers' ? 'stickers' : 'gifs';
    if (!searchQuery.trim()) {
      const initialQuery = activeTab === 'stickers' ? STICKER_CATEGORIES[activeCategory].query : '';
      fetchMedia(initialQuery, type);
    }
  }, [activeTab, activeCategory, searchQuery, fetchMedia]);

  // When sticker category changes
  const handleCategoryChange = (idx) => {
    setActiveCategory(idx);
    setSearchQuery('');
  };

  // Debounced search
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const type = activeTab === 'stickers' ? 'stickers' : 'gifs';
      fetchMedia(val, type);
    }, 400);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const type = activeTab === 'stickers' ? 'stickers' : 'gifs';
    fetchMedia(searchQuery, type);
  };

  const handleItemClick = (item) => {
    if (activeTab === 'stickers') {
      onSelectSticker(item.url);
    } else {
      onSelectGif(item.url);
    }
  };

  return (
    <div className="sticker-gif-picker">
      {/* Tab Headers */}
      <div className="sgp-tabs">
        <button
          className={`sgp-tab ${activeTab === 'stickers' ? 'active' : ''}`}
          onClick={() => { setActiveTab('stickers'); setSearchQuery(''); setItems([]); }}
        >
          <Smile size={15} /> Stickers
        </button>
        <button
          className={`sgp-tab ${activeTab === 'gifs' ? 'active' : ''}`}
          onClick={() => { setActiveTab('gifs'); setSearchQuery(''); setItems([]); }}
        >
          <Image size={15} /> GIFs
        </button>
        <button className="sgp-close-btn" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="sgp-search-wrap">
        <form onSubmit={handleSearchSubmit} className="sgp-search-form">
          <Search size={14} className="sgp-search-icon" />
          <input
            type="text"
            placeholder={activeTab === 'gifs' ? 'Search GIFs...' : 'Search stickers...'}
            value={searchQuery}
            onChange={handleSearchChange}
            className="sgp-search-input"
          />
        </form>
      </div>

      {/* Sticker Category Tabs */}
      {activeTab === 'stickers' && !searchQuery.trim() && (
        <div className="sgp-pack-tabs">
          {STICKER_CATEGORIES.map((cat, idx) => (
            <button
              key={idx}
              className={`sgp-pack-tab ${activeCategory === idx ? 'active' : ''}`}
              onClick={() => handleCategoryChange(idx)}
              title={cat.label}
            >
              {cat.label.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Content Grid */}
      <div className="sgp-content">
        <div className="sgp-gif-grid">
          {loading ? (
            <div className="sgp-loading">
              <Loader2 className="animate-spin" size={28} />
              <span>Loading {activeTab === 'stickers' ? 'stickers' : 'GIFs'}...</span>
            </div>
          ) : items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className={`sgp-gif-item ${activeTab === 'stickers' ? 'sgp-sticker-img-item' : ''}`}
                onClick={() => handleItemClick(item)}
                title={item.title}
              >
                <img src={item.preview} alt={item.title} loading="lazy" />
              </div>
            ))
          ) : (
            <div className="sgp-empty">
              {activeTab === 'stickers' ? 'No stickers found. Try another category!' : 'No GIFs found. Try a different search!'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="sgp-footer">
        <span>Powered by GIPHY & Tenor</span>
      </div>
    </div>
  );
}

