import React, { useState } from 'react';
import styles from '@styles/components/ZoraAIChatButton.module.scss';
import { useAppTranslation } from '@hooks/useAppTranslation.ts';

interface ZoraAIChatButtonProps {
  onClick?: () => void;
}

const ZoraAIChatButton: React.FC<ZoraAIChatButtonProps> = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { translation } = useAppTranslation();
  const aiChatText = translation.components.chat.aiChatButton;

  return (
    <button
      className={styles.aiChatButton}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={aiChatText.text}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.aiIcon}
      >
        <path
          d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
          fill="currentColor"
        />
        <path
          d="M12 6C10.9 6 10 6.9 10 8V11H8C6.9 11 6 11.9 6 13C6 14.1 6.9 15 8 15H10V17C10 18.1 10.9 19 12 19C13.1 19 14 18.1 14 17V15H16C17.1 15 18 14.1 18 13C18 11.9 17.1 11 16 11H14V8C14 6.9 13.1 6 12 6ZM12 17V15H10V13H12V11H14V13H16V15H14V17H12Z"
          fill="currentColor"
        />
      </svg>
      <span className={styles.buttonText}>{aiChatText.text}</span>
      {isHovered && (
        <div className={styles.tooltip}>
          {aiChatText.tooltip}
        </div>
      )}
    </button>
  );
};

export default ZoraAIChatButton;
