import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

/**
 * Rich Text Editor Component (Notion-like)
 * Based on TipTap - stores content as JSON
 */
export default function RichTextEditor({ content, onChange, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing your lesson content...',
      }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: parseContent(content),
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <MenuBar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose max-w-none px-4 py-3 min-h-[200px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
}

/**
 * Parse content - supports both JSON and plain text
 */
function parseContent(content) {
  if (!content) return '';
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') return parsed;
    return content;
  } catch {
    return content;
  }
}

/**
 * Read-only content viewer for previewing rich text
 */
export function RichTextViewer({ content }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: parseContent(content),
    editable: false,
  });

  if (!editor) return <p className="text-gray-500 text-sm">{content}</p>;

  return (
    <EditorContent
      editor={editor}
      className="prose prose-sm max-w-none text-gray-600 line-clamp-3"
    />
  );
}

/**
 * Toolbar Menu Bar
 */
function MenuBar({ editor }) {
  const btnClass = (isActive) =>
    `p-1.5 rounded text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-100 text-blue-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
    }`;

  return (
    <div className="flex flex-wrap gap-0.5 p-2 border-b border-gray-200 bg-gray-50">
      {/* Text Type */}
      <select
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'paragraph') editor.chain().focus().setParagraph().run();
          else editor.chain().focus().toggleHeading({ level: parseInt(val) }).run();
        }}
        value={
          editor.isActive('heading', { level: 1 }) ? '1' :
          editor.isActive('heading', { level: 2 }) ? '2' :
          editor.isActive('heading', { level: 3 }) ? '3' : 'paragraph'
        }
        className="px-2 py-1 text-sm border border-gray-300 rounded bg-white mr-2"
      >
        <option value="paragraph">Text</option>
        <option value="1">H1</option>
        <option value="2">H2</option>
        <option value="3">H3</option>
      </select>

      <div className="w-px bg-gray-300 mx-1" />

      {/* Formatting */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive('bold'))}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive('italic'))}
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btnClass(editor.isActive('underline'))}
        title="Underline"
      >
        <span className="underline">U</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btnClass(editor.isActive('strike'))}
        title="Strikethrough"
      >
        <span className="line-through">S</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={btnClass(editor.isActive('code'))}
        title="Inline Code"
      >
        {'</>'}
      </button>

      <div className="w-px bg-gray-300 mx-1" />

      {/* Lists */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnClass(editor.isActive('bulletList'))}
        title="Bullet List"
      >
        &#8226; List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btnClass(editor.isActive('orderedList'))}
        title="Numbered List"
      >
        1. List
      </button>

      <div className="w-px bg-gray-300 mx-1" />

      {/* Blocks */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btnClass(editor.isActive('blockquote'))}
        title="Quote"
      >
        &ldquo; Quote
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={btnClass(editor.isActive('codeBlock'))}
        title="Code Block"
      >
        {'{ } Code'}
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={btnClass(false)}
        title="Horizontal Rule"
      >
        &#8213;
      </button>

      <div className="w-px bg-gray-300 mx-1" />

      {/* Table */}
      <button
        type="button"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        className={btnClass(false)}
        title="Insert Table"
      >
        Table
      </button>

      {/* Image */}
      <button
        type="button"
        onClick={() => {
          const url = window.prompt('Image URL:');
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }}
        className={btnClass(false)}
        title="Insert Image"
      >
        Image
      </button>

      <div className="flex-1" />

      {/* Undo/Redo */}
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="p-1.5 rounded text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30"
        title="Undo"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="p-1.5 rounded text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30"
        title="Redo"
      >
        Redo
      </button>
    </div>
  );
}
