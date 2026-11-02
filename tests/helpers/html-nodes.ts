import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'

/** How many raw HTML nodes the page's Markdown parser finds in `markdown`. */
export function htmlNodeCount(markdown: string): number {
  let count = 0
  const visit = (node: any) => {
    if (node.type === 'html') count++
    node.children?.forEach(visit)
  }
  visit(fromMarkdown(markdown, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }))
  return count
}
