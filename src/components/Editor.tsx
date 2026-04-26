'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import MarkdownViewer from '@/components/MarkdownViewer'
import styles from './Editor.module.css'

interface EditorProps {
  initialTitle?: string;
  initialContent?: string;
  action: (formData: FormData) => void;
  cancelHref: string;
}

export default function Editor({ initialTitle = '', initialContent = '', action, cancelHref }: EditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')

  return (
    <form action={action} className={styles.form}>
      <div className={styles.actionBar}>
        <button 
          type="button" 
          onClick={() => router.push(cancelHref)} 
          className={styles.buttonSecondary}
        >
          Cancel
        </button>
        <button type="submit" className={styles.buttonPrimary}>
          Save
        </button>
      </div>
      
      <input
        type="text"
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Article Title"
        required
        className={styles.titleInput}
      />
      
      <div className={styles.mobileTabs}>
        <button 
          type="button" 
          className={activeTab === 'write' ? styles.activeTab : styles.tab} 
          onClick={() => setActiveTab('write')}
        >
          Write
        </button>
        <button 
          type="button" 
          className={activeTab === 'preview' ? styles.activeTab : styles.tab} 
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
      </div>

      <div className={styles.workspace}>
        <div className={`${styles.pane} ${activeTab === 'write' ? styles.activePane : styles.hiddenPane}`}>
          <textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your markdown here..."
            required
            className={styles.textarea}
          />
        </div>
        <div className={`${styles.pane} ${styles.previewPane} ${activeTab === 'preview' ? styles.activePane : styles.hiddenPane}`}>
          <MarkdownViewer content={content || 'Nothing to preview.'} />
        </div>
      </div>
    </form>
  )
}
