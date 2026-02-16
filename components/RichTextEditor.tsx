
import React, { useRef, useEffect } from 'react';
import { Bold, Palette, Minus, Plus, Type } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, placeholder, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);
  const savedRange = useRef<Range | null>(null); // Armazena a seleção do usuário

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

  // Salva a posição do cursor/seleção sempre que o usuário mexe no texto
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRange.current = selection.getRangeAt(0);
    }
  };

  // Restaura a seleção antes de aplicar um comando
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
    // 1. Restaura a seleção para o comando aplicar no texto certo
    restoreSelection();
    
    // 2. Executa o comando
    document.execCommand(command, false, value);
    
    // 3. Foca de volta no editor e salva o novo estado
    if (editorRef.current) {
        editorRef.current.focus();
    }
    handleInput();
  };

  // Lógica inteligente para aumentar/diminuir fonte gradualmente na escala 1-7
  const handleFontSize = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    restoreSelection();

    // Tenta descobrir o tamanho atual.
    // O browser pode retornar "3" (escala) ou "16px" (computado).
    const queryVal = document.queryCommandValue('FontSize');
    let currentSize = 3; // Default (16px)

    if (queryVal) {
        if (/^[1-7]$/.test(queryVal)) {
            // Se já retornou na escala 1-7
            currentSize = parseInt(queryVal);
        } else {
            // Se retornou pixels, mapeamos para a nossa escala customizada (ver CSS abaixo)
            const pxVal = parseInt(queryVal);
            if (!isNaN(pxVal)) {
                if (pxVal <= 11) currentSize = 1;      // ~10px
                else if (pxVal <= 13) currentSize = 2; // ~13px
                else if (pxVal <= 16) currentSize = 3; // ~16px (Normal)
                else if (pxVal <= 18) currentSize = 4; // ~18px
                else if (pxVal <= 21) currentSize = 5; // ~21px
                else if (pxVal <= 24) currentSize = 6; // ~24px
                else currentSize = 7;                  // ~28px+
            }
        }
    }

    let newSize = currentSize + delta;
    if (newSize < 1) newSize = 1;
    if (newSize > 7) newSize = 7;

    execCmd('fontSize', newSize.toString());
  };

  // Previne que o botão roube o foco ao ser clicado (usa onMouseDown em vez de onClick)
  const handleMouseDown = (e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault(); // CRUCIAL: Impede perda de foco
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

        {/* Botões de Fonte Gradual */}
        <button 
          onMouseDown={(e) => handleFontSize(e, -1)} 
          className="p-1.5 rounded hover:bg-app-hover text-app-subtext hover:text-app-text flex items-center gap-1"
          title="Diminuir Fonte"
        >
            <Minus size={14} /> <span className="text-[10px] font-bold">A</span>
        </button>

        <button 
          onMouseDown={(e) => handleFontSize(e, 0)} // Reseta para 3 (Normal)
          onClick={() => execCmd('fontSize', '3')}
          className="p-1.5 rounded hover:bg-app-hover text-app-subtext hover:text-app-text"
          title="Tamanho Normal (16px)"
        >
            <Type size={16} />
        </button>

        <button 
          onMouseDown={(e) => handleFontSize(e, 1)} 
          className="p-1.5 rounded hover:bg-app-hover text-app-subtext hover:text-app-text flex items-center gap-1"
          title="Aumentar Fonte"
        >
            <Plus size={14} /> <span className="text-xs font-bold">A</span>
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

      {/* Editable Area */}
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onBlur={saveSelection}
        className="flex-1 p-4 bg-app-card text-app-text outline-none overflow-y-auto text-sm md:text-base leading-relaxed rich-editor-content"
        style={{ minHeight: '150px' }}
      ></div>

      <style>{`
        /* FORÇA O ESTILO APESAR DO RESET DO TAILWIND */
        .rich-editor-content b, 
        .rich-editor-content strong { 
            font-weight: 900 !important; 
            color: var(--app-gold); 
        }
        
        .rich-editor-content i, 
        .rich-editor-content em { 
            font-style: italic !important; 
        }

        .rich-editor-content u { 
            text-decoration: underline !important; 
        }

        /* 
           REMAPEAMENTO DA ESCALA 1-7 PARA PIXELS SUAVES 
           (Evita saltos gigantes como 16px -> 32px)
        */
        .rich-editor-content font[size="1"] { font-size: 10px !important; }
        .rich-editor-content font[size="2"] { font-size: 13px !important; }
        .rich-editor-content font[size="3"] { font-size: 16px !important; } /* Padrão */
        .rich-editor-content font[size="4"] { font-size: 18px !important; } /* Aumento suave */
        .rich-editor-content font[size="5"] { font-size: 21px !important; }
        .rich-editor-content font[size="6"] { font-size: 24px !important; }
        .rich-editor-content font[size="7"] { font-size: 28px !important; }

        .rich-editor-content[contenteditable]:empty::before {
            content: "${placeholder || ''}";
            color: gray;
            pointer-events: none;
            display: block;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
