Quero remover completamente a implementação atual do Mentor do Web App.

Contexto:
O projeto é construído com Vite e está hospedado na Vercel.

O Mentor anteriormente funcionava por link externo (iframe/redirecionamento). Agora ele não será lançado nesta versão.

🔥 O QUE DEVE SER FEITO
1️⃣ Remover completamente:

Qualquer iframe relacionado ao Mentor

Qualquer lógica de redirecionamento externo

Funções inutilizadas relacionadas ao Mentor

Imports não utilizados

Estados e hooks que ficaram como “resto”

Qualquer chamada de API relacionada ao Mentor

Limpar o código para não deixar resíduos ou warnings.

2️⃣ Manter o botão do Mentor no painel

Quando o usuário clicar no botão do Mentor:

Em vez de abrir iframe ou redirecionar, deve abrir um Card centralizado na tela com:

Título:
🚀 Mentor Estratégico

Texto:
“O Mentor por IA está em desenvolvimento e será lançado em uma futura atualização.
Todos os membros atuais terão acesso automaticamente quando for liberado.”

Botão:
“Entendi”

Ao clicar, apenas fecha o card.

🎨 Design

Seguir exatamente o mesmo padrão visual do Web App

Minimalista

Profissional

Sem exageros visuais

Responsivo

⚙️ Importante

Garantir que:

O projeto compile sem erros

Não existam variáveis órfãs

Não existam imports não utilizados

Não existam erros no build da Vercel

O botão do Mentor continue visível no painel
