import { useEffect, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';

interface Props {
  value: string; // HTML
  onChange: (html: string) => void;
  onRewrite?: (selection: string) => Promise<string>; // returns replacement HTML fragment
  placeholder?: string;
}

const ACCENT = '#4A2D6B';

export function RichTextEditor({ value, onChange, onRewrite, placeholder }: Props) {
  const [rewriting, setRewriting] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder ?? '본문을 작성하거나 위에서 ✨ AI 생성을 누르세요',
      }),
      Image,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external value into the editor without emitting an update (avoids loops).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const btn = (active: boolean) =>
    `px-2 py-1 rounded text-sm leading-none transition-colors ${
      active ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;
  const btnStyle = (active: boolean) => (active ? { backgroundColor: ACCENT } : undefined);

  const handleRewrite = async () => {
    if (!onRewrite || rewriting) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text.trim()) return;
    setRewriting(true);
    try {
      const result = await onRewrite(text);
      editor.chain().focus().deleteSelection().insertContent(result).run();
    } catch (err) {
      console.warn('RichTextEditor rewrite failed', err);
    } finally {
      setRewriting(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 px-2 py-1.5">
        {([1, 2, 3] as const).map((level) => (
          <button
            key={level}
            type="button"
            className={btn(editor.isActive('heading', { level }))}
            style={btnStyle(editor.isActive('heading', { level }))}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          >
            H{level}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <button
          type="button"
          className={btn(editor.isActive('bold')) + ' font-bold'}
          style={btnStyle(editor.isActive('bold'))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={btn(editor.isActive('italic')) + ' italic'}
          style={btnStyle(editor.isActive('italic'))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <button
          type="button"
          className={btn(editor.isActive('bulletList'))}
          style={btnStyle(editor.isActive('bulletList'))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • 목록
        </button>
        <button
          type="button"
          className={btn(editor.isActive('orderedList'))}
          style={btnStyle(editor.isActive('orderedList'))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. 목록
        </button>
        <button
          type="button"
          className={btn(editor.isActive('blockquote'))}
          style={btnStyle(editor.isActive('blockquote'))}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          인용
        </button>
        <button
          type="button"
          className={btn(false)}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          —
        </button>
      </div>

      {/* Editor */}
      <div
        className="min-h-[320px] px-4 py-3 text-[15px] leading-relaxed text-gray-800
          [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:min-h-[300px]
          [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-3
          [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-3
          [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-2
          [&_p]:my-2
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2
          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2
          [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600
          [&_hr]:my-4 [&_hr]:border-gray-200
          [&_img]:max-w-full [&_img]:rounded
          [&_.is-editor-empty:first-child::before]:text-gray-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0"
      >
        <EditorContent editor={editor} />
      </div>

      {/* Bubble menu — rewrite selection */}
      {onRewrite && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <button
            type="button"
            disabled={rewriting}
            onClick={handleRewrite}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-lg disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {rewriting ? '다시쓰는 중…' : '✨ 이 부분 다시쓰기'}
          </button>
        </BubbleMenu>
      )}
    </div>
  );
}
