import React, { useDeferredValue } from 'react';
import { Markdown } from '../Markdown/Markdown';
import styles from './MarkdownEditor.module.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your article content here...',
}) => {
  const deferredValue = useDeferredValue(value);

  return (
    <div className={styles.editorContainer}>
      <div className={styles.pane}>
        <div className={styles.paneHeader}>Editor</div>
        <textarea
          className={styles.textarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
        />
      </div>
      <div className={`${styles.pane} ${styles.previewPane}`}>
        <div className={styles.paneHeader}>Preview</div>
        <div className={styles.previewContent}>
          <Markdown content={deferredValue} />
        </div>
      </div>
    </div>
  );
};
