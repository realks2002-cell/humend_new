"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import FontFamily from "@tiptap/extension-font-family";
import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  ImagePlus,
  Link as LinkIcon,
  Quote,
  Code2,
  Minus,
  Loader2,
  Palette,
  Highlighter,
} from "lucide-react";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const FONT_OPTIONS = [
  { label: "기본", value: "" },
  { label: "나눔고딕", value: "NanumGothic" },
  { label: "나눔명조", value: "NanumMyeongjo" },
  { label: "D2Coding", value: "D2Coding" },
];

const HEADING_OPTIONS = [
  { label: "본문", value: 0 },
  { label: "제목 1", value: 1 },
  { label: "제목 2", value: 2 },
  { label: "제목 3", value: 3 },
];

const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999",
  "#E03131", "#E8590C", "#F59F00", "#2F9E44",
  "#1971C2", "#6741D9", "#C2255C", "#0C8599",
];

const HIGHLIGHT_COLORS = [
  "#FFF3BF", "#FFE8CC", "#FFD8D8", "#D3F9D8",
  "#D0EBFF", "#E5DBFF", "#FFD6E4", "#C3FAE8",
];

export function RichEditor({ value, onChange, placeholder = "내용을 입력하세요..." }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textColorRef = useRef<HTMLInputElement>(null);
  const highlightColorRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      ImageExt,
      Placeholder.configure({ placeholder }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      FontFamily,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[120px] px-3 py-2 focus:outline-none",
      },
    },
  });

  const compressImage = async (file: File, maxWidth: number, quality: number): Promise<string> => {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    let { width, height } = bitmap;
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", quality);
  };

  const handleImageInsert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    try {
      const dataUrl = await compressImage(file, 800, 0.82);
      editor.chain().focus().setImage({ src: dataUrl }).run();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Editor image failed:", msg);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("링크 URL을 입력하세요", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex h-[160px] items-center justify-center rounded-md border">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentHeadingLevel = [1, 2, 3].find((level) =>
    editor.isActive("heading", { level })
  ) ?? 0;

  const currentFont = editor.getAttributes("textStyle").fontFamily || "";

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-0.5 border-b px-1 py-1">
        {/* 글꼴 선택 */}
        <select
          value={currentFont}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              editor.chain().focus().setFontFamily(val).run();
            } else {
              editor.chain().focus().unsetFontFamily().run();
            }
          }}
          className="h-7 rounded border px-1 text-xs"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* 제목 선택 */}
        <select
          value={currentHeadingLevel}
          onChange={(e) => {
            const level = Number(e.target.value);
            if (level === 0) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
            }
          }}
          className="h-7 rounded border px-1 text-xs"
        >
          {HEADING_OPTIONS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </select>

        <Separator />

        {/* 서식 */}
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          icon={<Bold className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          icon={<Italic className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          icon={<UnderlineIcon className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          icon={<Strikethrough className="h-3.5 w-3.5" />}
        />

        <Separator />

        {/* 글자색 */}
        <div className="relative">
          <ToolbarButton
            active={false}
            onClick={() => textColorRef.current?.click()}
            icon={<Palette className="h-3.5 w-3.5" />}
          />
          <input
            ref={textColorRef}
            type="color"
            className="invisible absolute left-0 top-full h-0 w-0"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
          {/* 빠른 색상 팔레트 */}
          <div className="absolute left-0 top-full z-50 hidden rounded border bg-white p-1 shadow-md group-focus-within:grid"
               style={{ display: "none" }}>
          </div>
        </div>

        {/* 하이라이트색 */}
        <div className="relative">
          <ToolbarButton
            active={editor.isActive("highlight")}
            onClick={() => highlightColorRef.current?.click()}
            icon={<Highlighter className="h-3.5 w-3.5" />}
          />
          <input
            ref={highlightColorRef}
            type="color"
            defaultValue="#FFF3BF"
            className="invisible absolute left-0 top-full h-0 w-0"
            onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
          />
        </div>

        <Separator />

        {/* 정렬 */}
        <ToolbarButton
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          icon={<AlignLeft className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          icon={<AlignCenter className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          icon={<AlignRight className="h-3.5 w-3.5" />}
        />

        <Separator />

        {/* 리스트 */}
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          icon={<List className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          icon={<ListOrdered className="h-3.5 w-3.5" />}
        />

        <Separator />

        {/* 삽입 */}
        <ToolbarButton
          active={editor.isActive("link")}
          onClick={handleLink}
          icon={<LinkIcon className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          active={false}
          onClick={() => fileInputRef.current?.click()}
          icon={<ImagePlus className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          active={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          icon={<Minus className="h-3.5 w-3.5" />}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageInsert}
        />

        <Separator />

        {/* 인용/코드 */}
        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          icon={<Quote className="h-3.5 w-3.5" />}
        />
        <ToolbarButton
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          icon={<Code2 className="h-3.5 w-3.5" />}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-7 w-7"
      onClick={onClick}
    >
      {icon}
    </Button>
  );
}

function Separator() {
  return <div className="mx-0.5 h-5 w-px bg-border" />;
}
