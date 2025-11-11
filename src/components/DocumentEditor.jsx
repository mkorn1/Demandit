import { useState, useEffect, useRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

/**
 * DocumentEditor - A Google Docs-like rich text editor
 * Supports both templates and drafts with auto-save functionality
 */
function DocumentEditor({
  content,
  onContentChange,
  onSave,
  isReadOnly = false,
  placeholder = 'Start typing...',
  autoSave = false,
  autoSaveDelay = 2000,
  showToolbar = true,
  className = ''
}) {
  const [editorContent, setEditorContent] = useState(content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  const quillRef = useRef(null)
  const saveTimeoutRef = useRef(null)

  // Update editor content when prop changes (from external source)
  useEffect(() => {
    if (content !== undefined && content !== editorContent) {
      setEditorContent(content || '')
      setHasChanges(false)
    }
  }, [content])

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && hasChanges && onSave && !isSaving) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(async () => {
        await handleSave()
      }, autoSaveDelay)

      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorContent, autoSave, hasChanges, autoSaveDelay])

  const handleChange = (value) => {
    setEditorContent(value)
    setHasChanges(true)
    if (onContentChange) {
      onContentChange(value)
    }
  }

  const handleSave = async () => {
    if (!onSave || isSaving) return

    setIsSaving(true)
    try {
      await onSave(editorContent)
      setHasChanges(false)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Error saving document:', error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  // Custom toolbar configuration
  const modules = {
    toolbar: showToolbar ? [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ] : false,
    clipboard: {
      matchVisual: false
    }
  }

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image'
  ]

  return (
    <div className={`document-editor flex flex-col h-full min-h-0 ${className}`}>
      {/* Toolbar with save button */}
      {showToolbar && !isReadOnly && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-red-900 bg-gray-900 flex-shrink-0">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-yellow-400 text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Unsaved changes
              </span>
            )}
            {lastSaved && !hasChanges && (
              <span className="text-green-400 text-xs">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="px-3 py-1.5 bg-blue-900 text-white rounded text-sm hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-800 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </>
            )}
          </button>
        </div>
      )}

      {/* Quill Editor */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={editorContent}
          onChange={handleChange}
          readOnly={isReadOnly}
          placeholder={placeholder}
          modules={modules}
          formats={formats}
        />
      </div>

      <style>{`
        .document-editor .ql-editor {
          line-height: 1.5;
        }
      `}</style>
    </div>
  )
}

export default DocumentEditor

