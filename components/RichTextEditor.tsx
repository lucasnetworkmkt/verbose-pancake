
import React, { useRef, useEffect } from 'react';
import { Bold, Palette, Heading1, Heading2, Type } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, placeholder, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
        if (editorRef.current.innerHTML !== content) {
            editorRef.current.innerHTML = content;
        }
    }
    isInternalUpdate.current = false;
  }, [content]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRange.current = selection.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (selection && savedRange.current) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
      saveSelection();
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    restoreSelection();
    document.execCommand(command, false, value);
    if (editorRef.current) {
        editorRef.current.focus();
    }
    handleInput();
  };

  const handleMouseDown = (e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault();
    execCmd(command, value);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      restoreSelection();
      execCmd('foreColor', e.target.value);
  };

  return (
    <div className={`flex flex-col border border-app-border rounded overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-app-input border-b border-app-border shrink-0 flex-wrap">
        <button 
          onMouseDown={(e) => handleMouseDown(e, 'bold')} 
          className="p-1.5 rounded hover:bg-app-hover text-app-subtext hover:text-app-text"
          title="Negrito"
        >
          <Bold size={16} />
        </button>

        <div className="h-4 w-[1px] bg-app-border mx-1"></div>

        {/* Botões de Formatação */}
        <button 
          onMouseDown={(e) => handleMouseDown(e, 'formatBlock', 'H1')} 
          className="px-2 py-1 rounded hover:bg-app-hover text-app-subtext hover:text-app-text flex items-center gap-1 text-xs font-bold"
          title="Título (H1)"
        >
            <Heading1 size={14} /> Título
        </button>

        <button 
          onMouseDown={(e) => handleMouseDown(e, 'formatBlock', 'H2')} 
          className="px-2 py-1 rounded hover:bg-app-hover text-app-subtext hover:text-app-text flex items-center gap-1 text-xs font-bold"
          title="Subtítulo (H2)"
        >
            <Heading2 size={14} /> Subtítulo
        </button>

        <button 
          onMouseDown={(e) => handleMouseDown(e, 'formatBlock', 'P')} 
          className="px-2 py-1 rounded hover:bg-app-hover text-app-subtext hover:text-app-text flex items-center gap-1 text-xs font-bold"
          title="Texto Normal (P)"
        >
            <Type size={14} /> Normal
        </button>
        
        <div className="h-4 w-[1px] bg-app-border mx-1"></div>

        <div className="relative flex items-center group cursor-pointer" title="Cor do Texto">
            <Palette size={16} className="text-app-subtext absolute left-1.5 pointer-events-none z-10" />
            <input 
                type="color" 
                onChange={handleColorChange}
                onClick={() => restoreSelection()} 
                className="w-8 h-8 opacity-0 cursor-pointer absolute left-0 top-0 z-20"
            />
             <div className="w-8 h-8 rounded hover:bg-app-hover flex items-center justify-center bg-transparent border border-transparent hover:border-app-border">
             </div>
        </div>
      </div>

      {/* Editable Area Wrapper */}
      <div className="flex-1 text-editor-sheet overflow-y-auto flex justify-center p-0 rounded-b">
        <div 
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onBlur={saveSelection}
          className="w-full text-editor-sheet outline-none rich-editor-content px-2 py-4 md:px-4 md:py-6 transition-all"
          style={{ minHeight: '100%' }}
        ></div>
      </div>

      <style>{`
        .text-editor-sheet {
            background-color: #000000;
        }
        [data-theme='light'] .text-editor-sheet {
            background-color: #FFFFFF;
        }

        .rich-editor-content {
           font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif !important;
           line-height: 1.625 !important;
           font-size: 16px !important;
           color: #E5E5E5 !important;
        }
        [data-theme='light'] .rich-editor-content {
           color: #374151 !important;
        }

        /* Limpa estilos antigos deixados pelo fontSize anterior ou spans */
        .rich-editor-content font,
        .rich-editor-content span {
            font-size: inherit !important;
            font-family: inherit !important;
            line-height: inherit !important;
        }

        .rich-editor-content b, 
        .rich-editor-content strong { 
            font-weight: 700 !important;
            color: #FFFFFF !important;
        }
        [data-theme='light'] .rich-editor-content b, 
        [data-theme='light'] .rich-editor-content strong {
            color: #111827 !important;
        }
        
        .rich-editor-content i, 
        .rich-editor-content em { 
            font-style: italic !important; 
        }

        .rich-editor-content u { 
            text-decoration: underline !important; 
            text-underline-offset: 2px !important;
        }
        
        .rich-editor-content h1,
        .rich-editor-content h1 * {
            font-size: 24px !important; 
            font-weight: 800 !important;
            line-height: 1.2 !important;
            color: #FFFFFF !important;
        }
        [data-theme='light'] .rich-editor-content h1,
        [data-theme='light'] .rich-editor-content h1 * {
            color: #111827 !important;
        }

        .rich-editor-content h1 {
            margin-top: 1.5em !important;
            margin-bottom: 0.5em !important;
            border-bottom: 2px solid #333333 !important;
            padding-bottom: 0.25em !important;
        }
        [data-theme='light'] .rich-editor-content h1 {
            border-bottom: 2px solid #f3f4f6 !important;
        }

        .rich-editor-content h1:first-child {
            margin-top: 0 !important;
        }
        
        .rich-editor-content h2,
        .rich-editor-content h2 * {
            font-size: 20px !important;
            font-weight: 700 !important;
            line-height: 1.3 !important;
            color: #E5E5E5 !important;
        }
        [data-theme='light'] .rich-editor-content h2,
        [data-theme='light'] .rich-editor-content h2 * {
            color: #1f2937 !important;
        }

        .rich-editor-content h2 {
            margin-top: 1.25em !important;
            margin-bottom: 0.5em !important;
        }
        
        .rich-editor-content p, 
        .rich-editor-content div {
            font-size: 16px !important;
            line-height: 1.625 !important;
            margin-bottom: 0.75em !important;
            margin-top: 0 !important;
            min-height: 1.625em !important; 
            color: inherit !important;
        }

        .rich-editor-content p:last-child {
            margin-bottom: 0 !important;
        }

        .rich-editor-content[contenteditable]:empty::before {
            content: "${placeholder || ''}";
            color: #6B7280;
            pointer-events: none;
            display: block;
        }
        [data-theme='light'] .rich-editor-content[contenteditable]:empty::before {
            color: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
