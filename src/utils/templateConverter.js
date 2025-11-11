/**
 * Template Content Converter
 * Handles conversion between HTML (for editing) and plain text (for LLM generation)
 * Preserves structure and formatting cues for better LLM structure preservation
 */

/**
 * Converts HTML to plain text while preserving structure
 * Maintains line breaks, spacing, and formatting cues that help LLMs understand structure
 * @param {string} html - HTML content from rich text editor
 * @returns {string} Plain text with preserved structure
 */
export function htmlToPlainText(html) {
  if (!html) return ''
  
  // Create a temporary div element
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  
  // Function to recursively process nodes and preserve structure
  function processNode(node, result = []) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim()
      if (text) {
        result.push(text)
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase()
      
      // Handle block-level elements that should create line breaks
      const blockElements = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre']
      const isBlockElement = blockElements.includes(tagName)
      
      // Add spacing before block elements (except first)
      if (isBlockElement && result.length > 0 && result[result.length - 1] !== '') {
        result.push('')
      }
      
      // Process children
      for (const child of node.childNodes) {
        processNode(child, result)
      }
      
      // Add spacing after block elements
      if (isBlockElement) {
        result.push('')
      }
      
      // Handle specific formatting
      if (tagName === 'br') {
        result.push('')
      } else if (tagName === 'li') {
        // List items: add bullet marker if not already present
        const lastItem = result[result.length - 1]
        if (lastItem && !lastItem.startsWith('- ') && !lastItem.match(/^\d+\.\s/)) {
          result[result.length - 1] = `- ${lastItem}`
        }
      }
    }
    
    return result
  }
  
  // Process all nodes
  const parts = processNode(tmp)
  
  // Join and clean up excessive blank lines (max 2 consecutive)
  let text = parts.join('\n')
  text = text.replace(/\n{3,}/g, '\n\n')
  
  // Trim leading/trailing whitespace
  text = text.trim()
  
  return text
}

/**
 * Converts plain text to HTML for rich text editor
 * Basic conversion - preserves line breaks and structure
 * @param {string} text - Plain text content
 * @returns {string} HTML content for editor
 */
export function plainTextToHtml(text) {
  if (!text) return ''
  
  // Split by double newlines (paragraphs) and single newlines (line breaks)
  const paragraphs = text.split(/\n\s*\n/)
  
  const htmlParagraphs = paragraphs.map(para => {
    // Handle single newlines within paragraph (convert to <br>)
    const lines = para.split('\n').filter(line => line.trim())
    if (lines.length === 0) return ''
    
    // If single line, return as paragraph
    if (lines.length === 1) {
      return `<p>${escapeHtml(lines[0])}</p>`
    }
    
    // Multiple lines: join with <br>
    return `<p>${lines.map(line => escapeHtml(line)).join('<br>')}</p>`
  }).filter(p => p)
  
  return htmlParagraphs.join('')
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Detects if content is HTML or plain text
 * @param {string} content - Content to check
 * @returns {boolean} True if content appears to be HTML
 */
export function isHtmlContent(content) {
  if (!content) return false
  
  // Check for HTML tags
  const htmlTagPattern = /<[a-z][\s\S]*>/i
  return htmlTagPattern.test(content)
}

/**
 * Gets plain text version of template content
 * Handles both HTML and plain text inputs
 * @param {string} content - Template content (HTML or plain text)
 * @returns {string} Plain text version
 */
export function getPlainTextContent(content) {
  if (!content) return ''
  
  // If already plain text, return as-is
  if (!isHtmlContent(content)) {
    return content
  }
  
  // Convert HTML to plain text
  return htmlToPlainText(content)
}

/**
 * Gets HTML version of template content for editing
 * Converts plain text to HTML if needed
 * @param {string} content - Template content (HTML or plain text)
 * @returns {string} HTML version for editor
 */
export function getHtmlContent(content) {
  if (!content) return ''
  
  // If already HTML, return as-is
  if (isHtmlContent(content)) {
    return content
  }
  
  // Convert plain text to HTML
  return plainTextToHtml(content)
}

