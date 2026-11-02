import React, { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { createEditorExtensions } from '../lib/editor-extensions'
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2, ImageIcon, Undo2, Redo2 } from 'lucide-react'

interface Props {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  minHeightClass?: string
}

function readMarkdown(editor: { storage: any }): string {
  return editor.storage.markdown.getMarkdown()
}

function ToolbarButton({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`p-2 rounded transition-colors ${active ? 'bg-bjj-accent/20 text-bjj-accent' : 'text-bjj-textMuted hover:text-white hover:bg-bjj-surfaceHover'}`}
    >
      {children}
    </button>
  )
}

/** Rich text in, Markdown out. `value` seeds the editor and is re-applied only when it changes from outside. */
export function RichTextEditor({ value, onChange, placeholder, minHeightClass = 'min-h-[320px]' }: Props) {
  const lastEmitted = useRef(value)

  const editor = useEditor({
    extensions: createEditorExtensions(placeholder),
    content: value,
    editorProps: {
      attributes: {
        class: `prose prose-invert max-w-none focus:outline-none px-4 py-3 ${minHeightClass} prose-headings:font-heading prose-a:text-bjj-accent`,
      },
    },
    onUpdate({ editor }) {
      const md = readMarkdown(editor)
      lastEmitted.current = md
      onChange(md)
    },
  })

  // Apply external changes (loading an article, regenerating, restoring a backup).
  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      lastEmitted.current = value
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  function setLink() {
    const previous = editor!.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL (https://…)', previous ?? 'https://')
    if (url === null) return
    if (url.trim() === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    if (!/^https?:\/\//i.test(url.trim())) {
      window.alert('Links must start with http:// or https://')
      return
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  function addImage() {
    const src = window.prompt('Image URL (must be https://…)')
    if (!src) return
    if (!/^https:\/\//i.test(src.trim())) {
      window.alert('Image links must start with https://')
      return
    }
    const alt = window.prompt('Caption / what this image shows (the AI reads this)') ?? ''
    editor!.chain().focus().setImage({ src: src.trim(), alt: alt.trim() }).run()
  }

  return (
    <div className="rounded-lg border border-bjj-border bg-bjj-bg focus-within:border-bjj-accent/60 transition-colors">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-bjj-border px-2 py-1.5">
        <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Subheading" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-bjj-border" />
        <ToolbarButton title="Link (paste a YouTube link on its own line to embed a video)" active={editor.isActive('link')} onClick={setLink}><Link2 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Image by URL" onClick={addImage}><ImageIcon className="w-4 h-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-bjj-border" />
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 className="w-4 h-4" /></ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
