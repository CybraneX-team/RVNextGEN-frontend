"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { Bold, Heading1, Heading2, Italic, List, ListOrdered, LoaderCircle, Quote, Save } from "lucide-react";
import styles from "./RichTextDocument.module.css";

export default function RichTextDocument({ text, label, editing, saving, onSave, onCancel }: {
  text: string; label: string; editing: boolean; saving: boolean; onSave: (markdown: string) => void; onCancel: () => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: text,
    contentType: "markdown",
    editable: false,
    immediatelyRender: false,
  });
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      heading1: editor?.isActive("heading", { level: 1 }) ?? false,
      heading2: editor?.isActive("heading", { level: 2 }) ?? false,
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      bullet: editor?.isActive("bulletList") ?? false,
      ordered: editor?.isActive("orderedList") ?? false,
      quote: editor?.isActive("blockquote") ?? false,
    }),
  });

  useEffect(() => {
    if (!editor) return;
    if (!editing) editor.commands.setContent(text, { contentType: "markdown", emitUpdate: false });
    editor.setEditable(editing && !saving);
    if (editing && !saving) editor.commands.focus("end");
  }, [editor, editing, saving, text]);

  if (!editor) return <div className="min-h-[180px] text-[13px] text-white/35" role="status">Preparing formatted text…</div>;

  const tools = [
    { name: "Heading 1", icon: Heading1, pressed: active?.heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { name: "Heading 2", icon: Heading2, pressed: active?.heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { name: "Bold", icon: Bold, pressed: active?.bold, action: () => editor.chain().focus().toggleBold().run() },
    { name: "Italic", icon: Italic, pressed: active?.italic, action: () => editor.chain().focus().toggleItalic().run() },
    { name: "Bulleted list", icon: List, pressed: active?.bullet, action: () => editor.chain().focus().toggleBulletList().run() },
    { name: "Numbered list", icon: ListOrdered, pressed: active?.ordered, action: () => editor.chain().focus().toggleOrderedList().run() },
    { name: "Quote", icon: Quote, pressed: active?.quote, action: () => editor.chain().focus().toggleBlockquote().run() },
  ];

  return <div>
    {editing && <div role="toolbar" aria-label={`${label} formatting`} className="mb-5 flex flex-wrap items-center gap-1 border-b border-white/[.08] pb-3">
      {tools.map(({ name, icon: Icon, pressed, action }) => <button key={name} type="button" title={name} aria-label={name} aria-pressed={pressed ?? false} disabled={saving} onClick={action} className={`grid size-9 place-items-center rounded-lg transition-colors ${pressed ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/[.07] hover:text-white"}`}><Icon className="size-4" /></button>)}
    </div>}
    <EditorContent editor={editor} aria-label={`${label} content`} className={`${styles.document} ${editing ? styles.editing : ""}`} />
    {editing && <div className="mt-5 flex items-center justify-end gap-2 border-t border-white/[.08] pt-4">
      <button type="button" onClick={onCancel} disabled={saving} className="rounded-full px-4 py-2 text-[12px] text-white/55 hover:bg-white/[.06] hover:text-white disabled:opacity-40">Cancel</button>
      <button type="button" onClick={() => onSave(editor.getMarkdown())} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[12px] font-medium text-[#111114] hover:bg-white/85 disabled:opacity-50">{saving ? <LoaderCircle className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}{saving ? "Saving…" : "Save changes"}</button>
    </div>}
  </div>;
}
