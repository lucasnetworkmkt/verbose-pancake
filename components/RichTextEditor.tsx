
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

  // Previne que o botão roube o foco ao ser clicado (usa onMouseDown em vez de onClick)
  const handleMouseDown = (e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault(); // CRUCIAL: Impede perda de foco
    execCmd(command, value);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Para o input de cor, o foco já foi perdido para abrir a janela de cor
      // Então precisamos restaurar explicitamente
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

        {/* Tamanhos de Fonte: 1=10px, 2=13px, 3=16px, 4=18px, 5=24px, 6=32px, 7=48px */}
        <button 
          onMouseDown={(e) => handleMouseDown(e, 'fontSize', '2')} 
          className="p-1.5 rounded hover:bg-app-hover text-app-subtext hover:text-app-text"
          title="Diminuir Fonte"
        >
            <Minus size={16} />
        </button>

        <button 
          onMouseDown={(e) => handleMouseDown(e, 'fontSize', '3')} // Padrão
          className="p-1.5 rounded hover:bg-app-hover text-app-subtext hover:text-app-text"
          title="Tamanho Normal"
        >
            <Type size={16} />
        </button>

        <button 
          onMouseDown={(e) => handleMouseDown(e, 'fontSize', '5')} 
          className="p-1.5 rounded hover:bg-app-hover text-app-subtext hover:text-app-text"
          title="Aumentar Fonte"
        >
            <Plus size={16} />
        </button>
        
        <div className="h-4 w-[1px] bg-app-border mx-1"></div>

        <div className="relative flex items-center group cursor-pointer" title="Cor do Texto">
            <Palette size={16} className="text-app-subtext absolute left-1.5 pointer-events-none z-10" />
            <input 
                type="color" 
                onChange={handleColorChange}
                // Importante: restaurar seleção ao clicar no input para garantir que temos o range salvo
                onClick={() => restoreSelection()} 
                className="w-8 h-8 opacity-0 cursor-pointer absolute left-0 top-0 z-20"
            />
             <div className="w-8 h-8 rounded hover:bg-app-hover flex items-center justify-center bg-transparent border border-transparent hover:border-app-border">
                 {/* Visual Wrapper */}
             </div>
        </div>
      </div>

      {/* Editable Area */}
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onMouseUp={saveSelection} // Salva seleção ao soltar o mouse
        onKeyUp={saveSelection}   // Salva seleção ao navegar com teclado
        onBlur={saveSelection}    // Salva seleção ao sair (para o color picker funcionar)
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

        /* CORREÇÃO DE TAMANHOS DE FONTE (execCommand usa font size=1..7) */
        .rich-editor-content font[size="1"] { font-size: 0.75rem !important; } /* 12px */
        .rich-editor-content font[size="2"] { font-size: 0.875rem !important; } /* 14px */
        .rich-editor-content font[size="3"] { font-size: 1rem !important; }      /* 16px */
        .rich-editor-content font[size="4"] { font-size: 1.25rem !important; }   /* 20px */
        .rich-editor-content font[size="5"] { font-size: 1.5rem !important; }    /* 24px */
        .rich-editor-content font[size="6"] { font-size: 2rem !important; }      /* 32px */
        .rich-editor-content font[size="7"] { font-size: 3rem !important; }      /* 48px */

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
