import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';

const GIPHY_API_KEY = 'LIVDSRZtEYv8HVC5Hp3Ih2GC1yfyCGoH'; // Public Giphy API Key for development

export default function GifPicker({ onSelectGif, onClose }) {
  const [gifs, setGifs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch trending or search results
  const fetchGifs = async (query = '') => {
    setLoading(true);
    try {
      let url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;
      if (query.trim()) {
        url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      if (result.data) {
        // Map Giphy structure to simple URL format
        const formattedGifs = result.data.map(item => ({
          id: item.id,
          title: item.title,
          url: item.images.fixed_height.url,
          preview: item.images.fixed_height_small.url
        }));
        setGifs(formattedGifs);
      }
    } catch (error) {
      console.error('Error fetching GIFs from Giphy:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGifs();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchGifs(searchQuery);
  };

  return (
    <div className="gif-picker-popover">
      <div className="gif-picker-header">
        <form onSubmit={handleSearchSubmit} className="gif-search-form">
          <input
            type="text"
            placeholder="Search GIFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="gif-search-input"
          />
          <button type="submit" className="gif-search-btn">
            <Search size={16} />
          </button>
        </form>
      </div>

      <div className="gif-picker-results">
        {loading ? (
          <div className="gif-loading-container">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : gifs.length > 0 ? (
          <div className="gif-grid">
            {gifs.map((gif) => (
              <div
                key={gif.id}
                className="gif-item"
                onClick={() => onSelectGif(gif.url)}
              >
                <img src={gif.preview} alt={gif.title} loading="lazy" />
              </div>
            ))}
          </div>
        ) : (
          <div className="gif-empty-state">No GIFs found</div>
        )}
      </div>
    </div>
  );
}
