import React, { useState } from 'react';
import { X } from 'lucide-react';

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😗', '😙', '😚', '🤗', '🤩', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤭', '🫢', '🤫', '🤔', '🫣', '🤐', '🤨', '😐', '😑', '😶', '🫡', '😏', '😒', '🙄', '😬', '😮💨', '🤥', '🫠', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
  'Love': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️🔥', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '😻', '💋', '💏', '💑', '🫶', '🤟', '🫂'],
  'Gestures': ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🫰', '🤙', '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👏', '🙌', '🫶', '👐', '🤲', '🙏', '✊', '👊', '🤛', '🤜', '💪', '🦾'],
  'Fun': ['🎉', '🎊', '🎈', '🎁', '🎂', '🍰', '🧁', '🍕', '🍔', '🌮', '🍟', '🍿', '🍩', '🍪', '🍫', '🍬', '☕', '🍺', '🍻', '🥂', '🎮', '🎯', '🎪', '🎭', '🎨', '🎵', '🎶', '🎸', '🎹'],
  'Nature': ['🌸', '🌺', '🌻', '🌹', '🌷', '💐', '🌿', '🍀', '🍁', '🍂', '🌳', '🌴', '🌵', '🍃', '☀️', '🌙', '⭐', '✨', '🌈', '🔥', '💧', '🌊', '❄️', '⛄', '🦋', '🐝', '🐣', '🐶', '🐱'],
  'Objects': ['📱', '💻', '⌚', '📷', '🎥', '📺', '🔔', '📣', '💡', '🔑', '🗝️', '💎', '👑', '🏆', '🥇', '🎖️', '🏅', '📌', '📎', '✏️', '📝', '📚', '🎓', '💊', '🩹', '🧸', '🪄', '🔮']
};

export default function EmojiPicker({ onSelectEmoji, onClose }) {
  const [activeCategory, setActiveCategory] = useState('Smileys');

  const categoryNames = Object.keys(EMOJI_CATEGORIES);

  return (
    <div className="emoji-picker-popover">
      <div className="emoji-picker-header">
        <span className="emoji-picker-title">Emojis</span>
        <button onClick={onClose} className="emoji-picker-close">
          <X size={14} />
        </button>
      </div>

      <div className="emoji-category-tabs">
        {categoryNames.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`emoji-cat-btn ${activeCategory === cat ? 'active' : ''}`}
            title={cat}
          >
            {EMOJI_CATEGORIES[cat][0]}
          </button>
        ))}
      </div>

      <div className="emoji-grid">
        {EMOJI_CATEGORIES[activeCategory].map((emoji, i) => (
          <button
            key={i}
            className="emoji-item"
            onClick={() => onSelectEmoji(emoji)}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
