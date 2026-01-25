import { Priority, EvolutionChallenge, EvolutionChallengeLevel3 } from './types';

export const COLORS = {
  BG: '#0A0A0A',
  CARD: '#151F28',
  TEXT_MAIN: '#FFFFFF',
  TEXT_SEC: '#9CA3AF',
  RED: '#E50914',
  GOLD: '#FFD700',
  GREY_BORDER: '#374151',
  AZURE_CARD: '#9FB4C7' // Cor solicitada para o card de desafio
};

// URL fornecida pelo usuário
export const EAGLE_AVATAR_URL = "https://i.ibb.co/RkxtmqTk/Chat-GPT-Image-23-de-jan-de-2026-17-57-47-removebg-preview.png";
export const FALLBACK_AVATAR_URL = "https://ui-avatars.com/api/?name=Codigo+Execucao&background=E50914&color=fff&size=512&rounded=false&bold=true&length=2";

export const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case Priority.HIGH: return COLORS.RED;
    case Priority.MODERATE: return COLORS.GOLD;
    case Priority.LOW: return COLORS.TEXT_SEC;
    default: return COLORS.TEXT_SEC;
  }
};

export const getPriorityBorderClass = (priority: Priority) => {
  switch (priority) {
    case Priority.HIGH: return 'border-app-red';
    case Priority.MODERATE: return 'border-app-gold';
    case Priority.LOW: return 'border-gray-600';
    default: return 'border-gray-600';
  }
};

// --- MAPA DA EVOLUÇÃO: NÍVEL 1 (INICIANTE) ---
export const EVOLUTION_CHALLENGES: EvolutionChallenge[] = [
  { day: 1, title: "Clareza Total", description: "Definir por que você começou.", execution: "Escreva, de forma direta, o que você quer mudar na sua vida e o motivo real disso. Seja honesto, sem frases bonitas." },
  { day: 2, title: "Autoanálise Real", description: "Identificar o que te trava hoje.", execution: "Liste três hábitos, atitudes ou comportamentos que estão atrapalhando sua evolução." },
  { day: 3, title: "Redução de Dopamina", description: "Diminuir estímulos fáceis.", execution: "Reduza drasticamente redes sociais, jogos ou vídeos curtos hoje. Observe sua ansiedade e sua vontade de fugir do tédio." },
  { day: 4, title: "Hábito Ridiculamente Pequeno", description: "Criar um hábito fácil demais para falhar.", execution: "Escolha algo simples (ex: beber água ao acordar) e faça hoje." },
  { day: 5, title: "Ancoragem de Hábito", description: "Fixar o hábito em um horário.", execution: "Associe o hábito do Dia 4 a algo fixo da sua rotina, como acordar ou escovar os dentes." },
  { day: 6, title: "Regra das Duas Falhas", description: "Garantir constância.", execution: "Comprometa-se a não falhar dois dias seguidos no hábito criado." },
  { day: 7, title: "Revisão Semanal", description: "Ajustar o processo.", execution: "Analise o que funcionou e o que não funcionou nesses primeiros dias." },
  { day: 8, title: "Organização do Ambiente", description: "Organizar o espaço físico.", execution: "Organize sua mesa, quarto ou o local onde você mais passa tempo." },
  { day: 9, title: "Planejamento Diário", description: "Dar direção ao dia.", execution: "Liste três tarefas importantes que você precisa cumprir hoje." },
  { day: 10, title: "Foco Unitário", description: "Eliminar multitarefa.", execution: "Execute apenas uma tarefa por vez até finalizar." },
  { day: 11, title: "Ciclos de Foco", description: "Trabalhar em blocos.", execution: "Faça 25 minutos de foco total e 5 minutos de pausa." },
  { day: 12, title: "Controle do Ambiente", description: "Reduzir distrações externas.", execution: "Afaste o celular durante tarefas importantes." },
  { day: 13, title: "Movimento Diário", description: "Ativar o corpo.", execution: "Caminhe ou se movimente por pelo menos 20 minutos." },
  { day: 14, title: "Descanso Consciente", description: "Descansar sem culpa.", execution: "Descanse em um horário definido, sem exageros." },
  { day: 15, title: "Prioridade no Sono", description: "Dormir melhor.", execution: "Durma pelo menos 7 horas." },
  { day: 16, title: "Alimentação Consciente", description: "Melhorar o combustível do corpo.", execution: "Evite açúcar e ultraprocessados hoje." },
  { day: 17, title: "Hidratação", description: "Aumentar ingestão de água.", execution: "Beba água regularmente ao longo do dia." },
  { day: 18, title: "Redução de Comparação", description: "Limpar a mente.", execution: "Evite redes sociais por algumas horas." },
  { day: 19, title: "Escrita Mental", description: "Esvaziar a mente.", execution: "Escreva pensamentos, problemas ou preocupações." },
  { day: 20, title: "Presença", description: "Voltar para o agora.", execution: "Faça 5 minutos de respiração consciente." },
  { day: 21, title: "Revisão de Progresso", description: "Avaliar evolução.", execution: "Releia tudo o que você já concluiu até aqui." },
  { day: 22, title: "Rotina Fixa", description: "Criar previsibilidade.", execution: "Defina um horário fixo para uma atividade importante." },
  { day: 23, title: "Eliminar Gatilho", description: "Cortar um gatilho de procrastinação.", execution: "Identifique e elimine um gatilho específico." },
  { day: 24, title: "Vitória Pendente", description: "Resolver algo adiado.", execution: "Conclua uma tarefa que você vem evitando." },
  { day: 25, title: "Ação Sem Motivação", description: "Executar mesmo sem vontade.", execution: "Faça algo importante mesmo sem estar motivado." },
  { day: 26, title: "Corpo Ativo", description: "Fortalecer energia física.", execution: "Faça um treino simples ou caminhada." },
  { day: 27, title: "Gestão do Tempo", description: "Organizar o dia em blocos.", execution: "Use blocos de tempo para tarefas." },
  { day: 28, title: "Revisão de Hábitos", description: "Refinar o sistema.", execution: "Ajuste hábitos que não estão funcionando." },
  { day: 29, title: "Clareza Financeira", description: "Tomar consciência do dinheiro.", execution: "Anote gastos e ganhos do dia." },
  { day: 30, title: "Criar em vez de Consumir", description: "Produzir algo.", execution: "Crie um texto, plano ou ideia simples." },
  { day: 31, title: "Aplicação Prática", description: "Aplicar conhecimento.", execution: "Use algo que você aprendeu recentemente." },
  { day: 32, title: "Visão de Longo Prazo", description: "Pensar além do curto prazo.", execution: "Visualize onde quer estar em 1 ano." },
  { day: 33, title: "Responsabilidade Total", description: "Cortar desculpas.", execution: "Identifique sua maior desculpa atual." },
  { day: 34, title: "Constância", description: "Manter mesmo cansado.", execution: "Faça o mínimo necessário hoje." },
  { day: 35, title: "Organização Financeira", description: "Direcionar dinheiro.", execution: "Separe o que pode ser guardado ou reinvestido." },
  { day: 36, title: "Revisão Geral", description: "Consolidar aprendizado.", execution: "Compare quem você era no Dia 1 com hoje." },
  { day: 37, title: "Energia Física", description: "Reforçar o corpo.", execution: "Faça um treino ou caminhada mais longa." },
  { day: 38, title: "Silêncio Estratégico", description: "Reduzir estímulos.", execution: "Passe um período sem estímulos digitais." },
  { day: 39, title: "Planejamento do Próximo Nível", description: "Preparar evolução.", execution: "Planeje os próximos 40 dias." },
  { day: 40, title: "Consolidação Final", description: "Fechar o ciclo.", execution: "Escreva o que mudou e marque o compromisso de continuar." }
];

// --- MAPA DA EVOLUÇÃO: NÍVEL 2 (AVANÇADO) ---
export const EVOLUTION_CHALLENGES_LEVEL_2: EvolutionChallenge[] = [
  { day: 1, title: "Execução Antes da Vontade", description: "Execute uma tarefa importante sem esperar motivação.", execution: "Escolha algo relevante e comece imediatamente, sem negociação mental." },
  { day: 2, title: "Controle do Ambiente", description: "Ajuste seu ambiente para favorecer execução.", execution: "Remova distrações visuais, digitais ou físicas e execute uma tarefa nesse novo ambiente." },
  { day: 3, title: "Decisão Adiada", description: "Tome uma decisão que você vem empurrando há dias ou semanas.", execution: "Decida hoje e aja conforme a decisão." },
  { day: 4, title: "Execução Mínima Ininterrupta", description: "Mesmo em um dia ruim, execute o mínimo aceitável.", execution: "Não permita zero execução." },
  { day: 5, title: "Disciplina Silenciosa", description: "Cumpra sua rotina sem comentar com ninguém.", execution: "Execute em silêncio." },
  { day: 6, title: "Execução Sob Pressão", description: "Execute mesmo com imprevistos, atrasos ou desconforto.", execution: "Adapte, mas não abandone." },
  { day: 7, title: "Corpo + Mente", description: "Execute uma atividade física e uma atividade mental no mesmo dia.", execution: "Combine treino e estudo/leitura no mesmo dia." },
  { day: 8, title: "Revisão Brutal de Comportamento", description: "Identifique onde você ainda se sabota.", execution: "Anote e ajuste conscientemente." },
  { day: 9, title: "Dia de Alto Padrão", description: "Execute tudo com mais qualidade do que o normal.", execution: "Capricho e atenção total." },
  { day: 10, title: "Consolidação Parcial", description: "Revise os últimos 9 dias.", execution: "Identifique padrões que estão funcionando." },
  { day: 11, title: "Prioridade Absoluta", description: "Faça primeiro a tarefa mais importante do dia, antes de qualquer outra.", execution: "Não comece por e-mails ou redes sociais." },
  { day: 12, title: "Corte de Ruído", description: "Elimine uma distração recorrente do seu dia.", execution: "Identifique e bloqueie/remova essa distração." },
  { day: 13, title: "Ação Sem Planejamento Excessivo", description: "Pare de planejar e execute com o plano que já existe.", execution: "Saia do plano e vá para a ação." },
  { day: 14, title: "Execução Invisível", description: "Execute sem buscar reconhecimento ou validação externa.", execution: "Faça pelo resultado, não pelo aplauso." },
  { day: 15, title: "Ajuste de Rotina", description: "Identifique uma rotina ineficiente e ajuste hoje.", execution: "Melhore um processo do seu dia." },
  { day: 16, title: "Execução Mesmo Cansado", description: "Execute apesar do cansaço físico ou mental.", execution: "Prove para si mesmo que o cansaço não te para." },
  { day: 17, title: "Clareza Total de Prioridades", description: "Defina claramente o que importa hoje e elimine o resto.", execution: "Use a regra do 'se não for sim óbvio, é não'." },
  { day: 18, title: "Execução com Tempo Limitado", description: "Defina um tempo fechado para executar uma tarefa e cumpra.", execution: "Use um timer e foque até acabar." },
  { day: 19, title: "Corte de Desculpas", description: "Identifique sua desculpa mais comum e elimine-a hoje.", execution: "Não aceite sua própria justificativa." },
  { day: 20, title: "Consolidação da Metade", description: "Revise os primeiros 20 dias e ajuste o que for necessário.", execution: "Analise seu progresso até aqui." },
  { day: 21, title: "Execução Sem Perfeccionismo", description: "Execute sem buscar perfeição. Entregue.", execution: "Feito é melhor que perfeito." },
  { day: 22, title: "Foco em Entregável", description: "Execute pensando apenas no resultado final.", execution: "O que precisa estar pronto hoje?" },
  { day: 23, title: "Autocontrole Digital", description: "Reduza drasticamente o uso de redes sociais hoje.", execution: "Coloque limites rígidos de tempo." },
  { day: 24, title: "Execução Estruturada", description: "Siga um plano do início ao fim, sem pular etapas.", execution: "Respeite a ordem lógica das tarefas." },
  { day: 25, title: "Resistência Mental", description: "Continue mesmo quando bater desconforto ou tédio.", execution: "Abrace o tédio como parte do processo." },
  { day: 26, title: "Organização Estratégica", description: "Organize tarefas, rotinas e prioridades do dia seguinte.", execution: "Comece amanhã já sabendo o que fazer." },
  { day: 27, title: "Execução Sem Emoção", description: "Execute sem negociar com sentimentos.", execution: "Não pense, apenas faça." },
  { day: 28, title: "Constância Real", description: "Execute sem picos de empolgação ou queda brusca.", execution: "Mantenha o ritmo estável." },
  { day: 29, title: "Revisão de Identidade", description: "Reflita: quem você está se tornando com essas ações?", execution: "Escreva sobre sua nova identidade." },
  { day: 30, title: "Execução Consciente", description: "Execute sabendo exatamente o porquê da ação.", execution: "Conecte a tarefa ao seu propósito maior." },
  { day: 31, title: "Execução Antes da Vontade (Reforço)", description: "Reforce o padrão de executar sem depender de motivação.", execution: "Ação gera motivação, não o contrário." },
  { day: 32, title: "Ambiente como Aliado", description: "Otimize novamente seu ambiente para máxima execução.", execution: "Melhore seu espaço de trabalho." },
  { day: 33, title: "Eliminação de Excessos", description: "Corte tarefas, hábitos ou compromissos desnecessários.", execution: "Simplifique sua agenda." },
  { day: 34, title: "Execução com Pressão Interna", description: "Execute mesmo sem vontade e sem recompensa imediata.", execution: "Seja seu próprio chefe exigente." },
  { day: 35, title: "Controle Total do Dia", description: "Planeje e execute o dia com precisão.", execution: "Tente cumprir 100% do planejado." },
  { day: 36, title: "Execução Mesmo sem Resultado Visível", description: "Execute mesmo sem ver retorno imediato.", execution: "Confie no processo de longo prazo." },
  { day: 37, title: "Disciplina como Identidade", description: "Execute reforçando a identidade de alguém disciplinado.", execution: "Aja como a pessoa que você quer ser." },
  { day: 38, title: "Ajuste Fino de Rotinas", description: "Faça pequenos ajustes estratégicos nas rotinas.", execution: "Otimize tempo e energia." },
  { day: 39, title: "Execução Sem Autocomiseração", description: "Pare de se poupar. Execute.", execution: "Seja duro consigo mesmo hoje." },
  { day: 40, title: "Consolidação do Nível 2", description: "Revise os 40 dias e reconheça a evolução construída.", execution: "Escreva o que mudou e marque o compromisso de continuar." }
];

// --- MAPA DA EVOLUÇÃO: NÍVEL 3 (EXECUÇÃO REAL) ---
export const EVOLUTION_CHALLENGES_LEVEL_3: EvolutionChallengeLevel3[] = [
    { day: 1, title: "CORTE DE FRAQUEZA", task1Title: "Execução", task1Execution: "Eliminar definitivamente um hábito que te enfraquece (escolha consciente e irreversível).", task2Title: "Autodomínio", task2Execution: "Escrever e ler em voz alta: 'Eu não negocio mais com fraqueza.'" },
    { day: 2, title: "CORPO SOB COMANDO", task1Title: "Execução", task1Execution: "Treino físico ou esforço corporal real (mínimo 30 min).", task2Title: "Autodomínio", task2Execution: "Banho frio ou desconforto físico consciente." },
    { day: 3, title: "AÇÃO SEM PRAZER", task1Title: "Execução", task1Execution: "Fazer a tarefa mais chata do dia PRIMEIRO.", task2Title: "Autodomínio", task2Execution: "Zero reclamação verbal ou mental durante o dia." },
    { day: 4, title: "RESPONSABILIDADE TOTAL", task1Title: "Execução", task1Execution: "Resolver um problema antigo que você vem empurrando.", task2Title: "Autodomínio", task2Execution: "Não usar justificativas em nenhum momento." },
    { day: 5, title: "SILÊNCIO ESTRATÉGICO", task1Title: "Execução", task1Execution: "Executar algo importante sem contar para ninguém.", task2Title: "Autodomínio", task2Execution: "24h sem redes sociais (uso apenas funcional se necessário)." },
    { day: 6, title: "DECISÃO DIFÍCIL", task1Title: "Execução", task1Execution: "Tomar uma decisão que você vem evitando.", task2Title: "Autodomínio", task2Execution: "Sustentar a decisão sem recuar." },
    { day: 7, title: "CONSTÂNCIA SOB CANSAÇO", task1Title: "Execução", task1Execution: "Cumprir a rotina mesmo cansado.", task2Title: "Autodomínio", task2Execution: "Não verbalizar cansaço." },
    { day: 8, title: "ORDEM EXTERNA", task1Title: "Execução", task1Execution: "Organizar completamente um ambiente.", task2Title: "Autodomínio", task2Execution: "Manter organizado até dormir." },
    { day: 9, title: "CORTE DE DISTRAÇÃO", task1Title: "Execução", task1Execution: "Remover um app, jogo ou distração recorrente.", task2Title: "Autodomínio", task2Execution: "Não reinstalar." },
    { day: 10, title: "FOCO PROFUNDO", task1Title: "Execução", task1Execution: "90 minutos de foco absoluto, sem pausas.", task2Title: "Autodomínio", task2Execution: "Ignorar qualquer impulso de checar celular." },
    { day: 11, title: "PALAVRA SOB CONTROLE", task1Title: "Execução", task1Execution: "Falar apenas o necessário.", task2Title: "Autodomínio", task2Execution: "Não opinar sem ser solicitado." },
    { day: 12, title: "EXECUÇÃO FINANCEIRA", task1Title: "Execução", task1Execution: "Organizar gastos ou plano financeiro real.", task2Title: "Autodomínio", task2Execution: "Zero gasto impulsivo no dia." },
    { day: 13, title: "DISCIPLINA DE HORÁRIO", task1Title: "Execução", task1Execution: "Acordar no horário definido.", task2Title: "Autodomínio", task2Execution: "Sem soneca." },
    { day: 14, title: "AUTORIDADE PESSOAL", task1Title: "Execução", task1Execution: "Dizer “não” quando necessário.", task2Title: "Autodomínio", task2Execution: "Não se explicar demais." },
    { day: 15, title: "TAREFA QUE DÁ MEDO", task1Title: "Execução", task1Execution: "Iniciar algo que você vem adiando por medo.", task2Title: "Autodomínio", task2Execution: "Não fugir do desconforto." },
    { day: 16, title: "CONSTÂNCIA SEM RESULTADO", task1Title: "Execução", task1Execution: "Executar mesmo sem ver retorno.", task2Title: "Autodomínio", task2Execution: "Não reclamar da falta de resultado." },
    { day: 17, title: "CORTE DE PRAZER", task1Title: "Execução", task1Execution: "Eliminar um prazer do dia.", task2Title: "Autodomínio", task2Execution: "Não substituir por outro." },
    { day: 18, title: "ORDEM INTERNA", task1Title: "Execução", task1Execution: "Escrever pensamentos caóticos e organizar.", task2Title: "Autodomínio", task2Execution: "Não alimentar pensamentos negativos." },
    { day: 19, title: "EXECUÇÃO SOLITÁRIA", task1Title: "Execução", task1Execution: "Trabalhar sem estímulo externo.", task2Title: "Autodomínio", task2Execution: "Não buscar validação." },
    { day: 20, title: "RITMO FORÇADO", task1Title: "Execução", task1Execution: "Executar mesmo fora do ritmo ideal.", task2Title: "Autodomínio", task2Execution: "Não esperar “momento certo”." },
    { day: 21, title: "RESILIÊNCIA", task1Title: "Execução", task1Execution: "Finalizar algo mesmo exausto.", task2Title: "Autodomínio", task2Execution: "Não parar antes do fim." },
    { day: 22, title: "CONTROLE DO AMBIENTE", task1Title: "Execução", task1Execution: "Eliminar ruídos e distrações.", task2Title: "Autodomínio", task2Execution: "Manter o ambiente limpo o dia inteiro." },
    { day: 23, title: "EXECUÇÃO SEM EMOÇÃO", task1Title: "Execução", task1Execution: "Agir sem depender de vontade.", task2Title: "Autodomínio", task2Execution: "Ignorar oscilações emocionais." },
    { day: 24, title: "AUTOCOMANDO", task1Title: "Execução", task1Execution: "Seguir o plano sem ajustes.", task2Title: "Autodomínio", task2Execution: "Não renegociar consigo mesmo." },
    { day: 25, title: "DISCIPLINA ALIMENTAR", task1Title: "Execução", task1Execution: "Comer apenas o planejado.", task2Title: "Autodomínio", task2Execution: "Resistir a impulsos." },
    { day: 26, title: "TEMPO SOB CONTROLE", task1Title: "Execução", task1Execution: "Planejar e cumprir o dia por blocos.", task2Title: "Autodomínio", task2Execution: "Não estourar horários." },
    { day: 27, title: "POSTURA", task1Title: "Execução", task1Execution: "Postura corporal consciente o dia inteiro.", task2Title: "Autodomínio", task2Execution: "Corrigir sempre que perceber." },
    { day: 28, title: "CONSTÂNCIA FINAL", task1Title: "Execução", task1Execution: "Cumprir rotina completa.", task2Title: "Autodomínio", task2Execution: "Não acelerar para “acabar logo”." },
    { day: 29, title: "FOCO ABSOLUTO", task1Title: "Execução", task1Execution: "2h de foco profundo.", task2Title: "Autodomínio", task2Execution: "Zero multitarefa." },
    { day: 30, title: "DISCIPLINA SEM TESTEMUNHAS", task1Title: "Execução", task1Execution: "Executar sozinho.", task2Title: "Autodomínio", task2Execution: "Não anunciar esforço." },
    { day: 31, title: "EXECUÇÃO SOB PRESSÃO", task1Title: "Execução", task1Execution: "Cumprir tarefa com prazo curto.", task2Title: "Autodomínio", task2Execution: "Controlar ansiedade." },
    { day: 32, title: "AUTOCONTROLE VERBAL", task1Title: "Execução", task1Execution: "Falar menos que o normal.", task2Title: "Autodomínio", task2Execution: "Cortar impulsos de falar demais." },
    { day: 33, title: "CONSISTÊNCIA SEM RECOMPENSA", task1Title: "Execução", task1Execution: "Executar sem se premiar.", task2Title: "Autodomínio", task2Execution: "Não buscar dopamina." },
    { day: 34, title: "FINALIZAÇÃO", task1Title: "Execução", task1Execution: "Concluir algo iniciado neste nível.", task2Title: "Autodomínio", task2Execution: "Não abandonar no final." },
    { day: 35, title: "SILÊNCIO INTERNO", task1Title: "Execução", task1Execution: "Executar em silêncio mental.", task2Title: "Autodomínio", task2Execution: "Cortar pensamentos inúteis." },
    { day: 36, title: "AUTORRESPONSABILIDADE", task1Title: "Execução", task1Execution: "Assumir erro sem justificar.", task2Title: "Autodomínio", task2Execution: "Não se defender." },
    { day: 37, title: "DISCIPLINA SOB TÉDIO", task1Title: "Execução", task1Execution: "Executar mesmo entediado.", task2Title: "Autodomínio", task2Execution: "Não buscar estímulos." },
    { day: 38, title: "RIGIDEZ CONTROLADA", task1Title: "Execução", task1Execution: "Seguir regras sem flexibilizar.", task2Title: "Autodomínio", task2Execution: "Sustentar rigidez." },
    { day: 39, title: "IDENTIDADE", task1Title: "Execução", task1Execution: "Agir como quem você está se tornando.", task2Title: "Autodomínio", task2Execution: "Não agir como o antigo você." },
    { day: 40, title: "CONSOLIDAÇÃO", task1Title: "Execução", task1Execution: "Revisar os 40 dias e registrar aprendizados.", task2Title: "Autodomínio", task2Execution: "Não romantizar. Apenas consolidar." }
];