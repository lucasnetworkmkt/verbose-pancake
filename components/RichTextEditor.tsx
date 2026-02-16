
import React, { useRef, useEffect } from 'react';
import { Bold, Palette, Type, Minus, Plus } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, placeholder, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // Sincroniza o conteúdo inicial ou externo
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
        if (editorRef.current.innerHTML !== content) {
            editorRef.current.innerHTML = content;
        }
    }
    // Reset flag after external update effect
    isInternalUpdate.current = false;
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
    handleInput();
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      execCmd('foreColor', e.target.value);
  };

  return (
    <div className={`flex flex-col border border-app-border rounded overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-app-input border-b border-app-border shrink-0 flex-wrap">
        <button 
          onClick={() => execCmd('bold')} 
          className="p-1.5 rounded hover:bg-app-hover text-app-subtext hover:text-app-text"
          title="Negrito"
        >
          <Bold size={16} />
        </button>

        <div className="h-4 w-[1px] bg-app-border mx-1"></div>

        <button 
          onClick={() => execCmd('fontSize', '3')} // Normal
          className="p-1.5 rounded hover:bg-app-hover text-app-subtext hover:text-app-text"
          title="Tamanho Normal"
        >
            <span className="text-xs font-bold">A</span>
        </button>

        <button 
          onClick={() => execCmd('fontSize', '5')} // Large
          className="p-1.5 rounded hover:bg-app-hover text-app-subtext hover:text-app-text"
          title="Aumentar Fonte"
        >
            <Plus size={16} />
        </button>
        
        <button 
          onClick={() => execCmd('fontSize', '2')} // Small
          className="p-1.5 rounded hover:bg-app-hover text-app-subtext hover:text-app-text"
          title="Diminuir Fonte"
        >
            <Minus size={16} />
        </button>

        <div className="h-4 w-[1px] bg-app-border mx-1"></div>

        <div className="relative flex items-center group">
            <Palette size={16} className="text-app-subtext absolute left-1.5 pointer-events-none" />
            <input 
                type="color" 
                onChange={handleColorChange}
                className="w-8 h-8 opacity-0 cursor-pointer absolute left-0 top-0 z-10"
                title="Cor do Texto"
            />
             <div className="w-8 h-8 rounded hover:bg-app-hover flex items-center justify-center">
                 {/* Visual Wrapper for color input */}
             </div>
        </div>
      </div>

      {/* Editable Area */}
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="flex-1 p-4 bg-app-card text-app-text outline-none overflow-y-auto text-sm md:text-base leading-relaxed rich-editor-content"
        style={{ minHeight: '150px' }}
      ></div>

      <style>{`
        .rich-editor-content b, .rich-editor-content strong { color: var(--app-gold); }
        .rich-editor-content[contenteditable]:empty::before {
            content: "${placeholder || ''}";
            color: gray;
            pointer-events: none;
            display: block; /* For Firefox */
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
