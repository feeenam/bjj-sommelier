import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { Markdown } from 'tiptap-markdown'

/**
 * The editor's extension list, shared with the round-trip tests so the tests exercise the real config.
 * Everything the model may write has to survive an edit: Markdown is the stored format, and the whole
 * body is re-serialized on the first keystroke, so anything the editor has no node for would be lost.
 */
export function createEditorExtensions(placeholder = 'Start writing…') {
  return [
    StarterKit.configure({
      // All six levels: the model may write `#### Step` and the toolbar only offers two.
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow' } },
    }),
    // Inline so images sit inside a paragraph: block images are serialized to Markdown without a
    // trailing blank line, which glues the next paragraph's text onto the image.
    Image.configure({ inline: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({ placeholder }),
    Markdown.configure({ html: false, linkify: true, breaks: false, transformPastedText: true }),
  ]
}
