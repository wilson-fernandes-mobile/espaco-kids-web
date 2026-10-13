# Projeto: Sistema de Gerenciamento do Ministério Infantil de uma Igreja

## 1. Objetivo do projeto

Desenvolva uma aplicação web moderna, profissional, responsiva e intuitiva para gerenciamento de creches e ministérios infantis de igrejas.

O sistema será utilizado pela secretaria da igreja, coordenação do ministério infantil e professores para cadastrar famílias e crianças, organizar turmas, controlar entradas e saídas, emitir crachás de identificação com QR Code e solicitar a presença dos pais ou responsáveis durante as atividades.

O projeto deverá começar pelo FRONT-END WEB. Não desenvolver o aplicativo mobile nesta primeira etapa. Entretanto, a arquitetura visual e funcional deve considerar que futuramente haverá um aplicativo para Android e iOS utilizado pelos pais e responsáveis.

Todo o conteúdo da interface deverá estar em português brasileiro (pt-BR).

## 2. Identidade visual

Crie uma interface com aparência de um sistema SaaS profissional, moderno e acolhedor, apropriado para uma instituição religiosa que trabalha com crianças.

Diretrizes visuais:

- Design limpo, elegante e organizado.
- Layout administrativo com menu lateral fixo e cabeçalho superior.
- Fundo predominantemente claro, com superfícies brancas, cinzas suaves e cores discretas.
- Utilize azul como cor principal e verde como cor complementar, sem excesso de cores.
- Cards com bordas suaves, sombras discretas e espaçamento consistente.
- Tipografia moderna e legível.
- Ícones consistentes em vez de emojis.
- Tabelas profissionais com pesquisa, filtros, paginação e ações.
- Gráficos e indicadores visuais no dashboard.
- Modais, menus, notificações toast, estados vazios, carregamento e mensagens de erro.
- Interface totalmente responsiva para computadores, tablets e celulares.
- A experiência de uso deve ser simples o suficiente para voluntários com pouca familiaridade com tecnologia.

Não criar uma landing page comercial. Criar um sistema administrativo real, com telas internas navegáveis e fluxos de trabalho coerentes.

## 3. Estrutura de navegação

Criar um menu lateral com as seguintes opções:

1. Dashboard
2. Crianças
3. Famílias e responsáveis
4. Check-in e check-out
5. Turmas e salas
6. Crachás e QR Codes
7. Chamadas aos responsáveis
8. Notificações
9. Relatórios
10. Usuários e permissões
11. Configurações da igreja

O cabeçalho deverá conter o nome da igreja, seletor de unidade caso exista mais de uma, notificações, usuário conectado e menu de perfil.

## 4. Dashboard

Desenvolver um painel com informações relevantes para o funcionamento diário do ministério infantil.

Exibir indicadores como:

- Crianças presentes neste momento.
- Total de crianças cadastradas.
- Famílias cadastradas.
- Crianças aguardando retirada.
- Chamadas aos responsáveis pendentes.
- Total de entradas e saídas do dia.

Adicionar:

- Gráfico de frequência semanal.
- Distribuição de crianças por turma.
- Lista de crianças que estão presentes.
- Lista de chamadas aguardando atendimento.
- Atividades recentes.
- Ações rápidas para cadastrar uma criança, iniciar check-in, realizar check-out e gerar um crachá.

Todos os indicadores deverão ser alimentados por dados fictícios coerentes nesta etapa.

## 5. Cadastro de crianças

Criar uma tela de listagem com foto ou avatar, nome, idade, código de identificação, turma, situação atual e ações disponíveis.

Implementar pesquisa por nome ou código e filtros por turma, idade e situação.

O formulário de cadastro deverá contemplar:

- Nome completo.
- Nome pelo qual a criança é conhecida.
- Data de nascimento.
- Foto opcional.
- Código interno exclusivo gerado pelo sistema.
- Turma vinculada.
- Observações importantes para o cuidado da criança.
- Alergias e informações de saúde estritamente necessárias, com acesso restrito.
- Situação do cadastro.
- Vínculo com uma ou mais pessoas responsáveis.

Criar telas de visualização detalhada e edição do cadastro.

Na página de detalhes, exibir abas para informações pessoais, família, pessoas autorizadas, histórico de presença, histórico de chamadas e crachás emitidos.

## 6. Cadastro de famílias e responsáveis

Uma família poderá ter várias crianças vinculadas. Uma criança poderá ter mais de um responsável.

Criar cadastro de família com:

- Código exclusivo da família.
- Nome de referência da família.
- Telefone principal.
- E-mail, quando disponível.
- Endereço, somente se necessário.
- Lista de crianças vinculadas.

Cada responsável deverá possuir:

- Nome completo.
- Telefone.
- E-mail opcional.
- Grau de parentesco ou relação com a criança.
- Preferência de contato.
- Situação do vínculo.
- Indicação de responsável principal.

Criar uma área específica para pessoas autorizadas a buscar a criança, permitindo registrar nome, contato, relação com a criança e autorização vigente.

Não considerar automaticamente todo familiar cadastrado como autorizado para retirada.

## 7. Crachás com QR Code

Criar um módulo específico para gerar, visualizar, imprimir e reemitir crachás.

Cada crachá deverá apresentar:

- Nome da igreja.
- Nome da criança.
- Código exclusivo da criança.
- Identificador da família, quando apropriado.
- QR Code.
- Turma, opcionalmente.
- Identidade visual infantil discreta e profissional.

Criar modelos de crachá para impressão, com dimensões configuráveis e suporte a impressão individual ou em lote.

O QR Code deverá representar um identificador opaco, aleatório e não previsível. Não incluir telefone, endereço, informações médicas ou outros dados pessoais diretamente no código.

Criar estados visuais para crachá ativo, perdido, cancelado ou substituído.

Prever uma tela para leitura de QR Code utilizando a câmera do dispositivo e uma alternativa de pesquisa manual pelo código de identificação.

A leitura deve localizar o cadastro autorizado dentro do sistema, sem liberar automaticamente a retirada da criança.

## 8. Check-in e check-out

Criar uma tela operacional de atendimento rápido, adequada para tablets utilizados na recepção da igreja.

O fluxo de entrada deverá permitir:

1. Ler o QR Code ou pesquisar a criança.
2. Confirmar nome e foto, quando disponível.
3. Exibir a turma.
4. Identificar a pessoa que entregou a criança.
5. Registrar a entrada com data e horário.
6. Confirmar o registro e exibir o status atualizado.

O fluxo de saída deverá permitir:

1. Localizar a criança presente.
2. Identificar a pessoa que veio buscá-la.
3. Validar se ela está autorizada.
4. Exibir a confirmação de identidade e as regras aplicáveis.
5. Registrar quem retirou a criança e o horário.
6. Encerrar a presença.

Impedir entradas duplicadas e saídas sem entrada correspondente. Exibir alertas claros quando houver inconsistências.

Se uma pessoa não estiver autorizada, bloquear a conclusão da retirada e orientar a equipe a contatar a coordenação.

## 9. Turmas e salas

Criar um módulo para administrar turmas e ambientes.

Permitir configurar:

- Nome da turma.
- Faixa etária.
- Sala ou ambiente.
- Capacidade máxima.
- Professores e auxiliares vinculados.
- Crianças matriculadas.
- Situação da turma.
- Dias e horários de funcionamento.

Exibir ocupação atual e alertar quando a capacidade estiver próxima do limite.

## 10. Chamadas aos responsáveis

Este é um dos módulos mais importantes do sistema.

Criar uma central para os professores solicitarem a presença dos pais ou responsáveis.

O fluxo deverá funcionar assim:

1. O professor abre a lista das crianças presentes em sua turma.
2. Seleciona a criança desejada.
3. Escolhe o motivo da chamada, como necessidade de atendimento, desconforto, necessidade de cuidados ou outro motivo.
4. Confirma a solicitação.
5. O sistema identifica os responsáveis e registra a chamada.
6. A solicitação aparece no painel administrativo e na central de atendimento.
7. Quando o aplicativo mobile for desenvolvido, o responsável receberá uma notificação push.
8. A equipe poderá acompanhar os estados: pendente, enviada, recebida, visualizada, atendida ou cancelada.

A equipe poderá registrar a chegada do responsável e concluir a chamada.

Permitir que a coordenação visualize todas as chamadas, enquanto cada professor visualiza prioritariamente as crianças e solicitações relacionadas à sua turma.

Não exibir informações médicas ou motivos sensíveis em notificações visíveis na tela bloqueada do celular.

## 11. Central de notificações

Criar uma central para consultar eventos e comunicações do sistema.

Categorias:

- Chamadas aos responsáveis.
- Entradas e saídas.
- Alertas operacionais.
- Comunicados da igreja.
- Avisos administrativos.

Cada notificação deverá apresentar data, horário, categoria, destinatário, situação de entrega quando disponível e histórico de alterações.

Na primeira versão, simular as notificações com dados locais. Preparar a estrutura para futura integração com notificações push e outros canais autorizados.

Não simular envio real de mensagens externas como se já estivesse implementado.

## 12. Relatórios

Criar uma área com filtros por período, turma e criança para consultar:

- Frequência diária e mensal.
- Histórico de check-in e check-out.
- Crianças presentes por turma.
- Chamadas aos responsáveis.
- Ocorrências e registros operacionais.
- Crianças com cadastros incompletos.

Permitir visualizar os resultados em tabelas e preparar uma opção de exportação CSV e impressão.

Restringir os relatórios de acordo com as permissões do usuário.

## 13. Usuários e permissões

Implementar interfaces para os seguintes perfis:

**Administrador:** acesso às configurações gerais, usuários, cadastros e relatórios autorizados.

**Coordenação:** gerenciamento das turmas, crianças, responsáveis, presença e chamadas.

**Professor:** acesso às turmas atribuídas, crianças presentes e solicitações de chamada.

**Recepção:** cadastro autorizado, check-in, check-out, crachás e validação de responsáveis.

**Responsável:** será atendido futuramente pelo aplicativo mobile, não sendo necessário desenvolver essa interface agora.

A interface deverá refletir as permissões de cada perfil. Não confiar apenas na ocultação de botões para garantir segurança; preparar a aplicação para validação de permissões também no backend futuro.

## 14. Configurações

Criar telas para configurar:

- Dados da igreja.
- Logo e identidade visual.
- Unidades e ambientes.
- Parâmetros de identificação.
- Modelos de crachás.
- Regras de check-in e check-out.
- Configuração de turmas.
- Preferências de notificação.
- Políticas de acesso e privacidade.

## 15. Requisitos técnicos do front-end

Antes de iniciar, analisar o projeto existente e preservar sua estrutura, quando houver.

Caso seja um projeto novo, utilizar uma arquitetura moderna, organizada e modular. Se nenhuma tecnologia tiver sido definida, propor React com TypeScript, Vite, Tailwind CSS e uma biblioteca consistente de componentes e ícones.

Requisitos:

- Componentes reutilizáveis.
- Rotas organizadas.
- Tipagem explícita.
- Formulários com validação.
- Dados de demonstração centralizados.
- Serviços e interfaces preparados para futura integração com API.
- Separação entre apresentação, regras de interface e acesso aos dados.
- Estados de carregamento, erro e ausência de dados.
- Navegação funcional entre as telas.
- Persistência local apenas para demonstração, sem armazenar dados sensíveis reais.
- Preparação para autenticação e controle de acesso no backend.
- Layout responsivo e acessível.
- Código limpo, consistente e documentado quando necessário.

Não criar um backend fictício complexo nem misturar regras de negócio diretamente em componentes visuais.

## 16. Segurança e privacidade

O sistema envolve dados de crianças e deverá ser projetado com proteção reforçada.

- Aplicar o princípio do menor privilégio.
- Preparar a arquitetura para conformidade com a LGPD e para o tratamento adequado de dados de crianças.
- Prever o registro da base legal aplicável, das autorizações e dos consentimentos necessários, conforme o caso.
- Restringir o acesso a informações sensíveis.
- Não expor dados pessoais no QR Code.
- Registrar operações relevantes em histórico de auditoria.
- Prever expiração e revogação de crachás.
- Evitar que uma simples leitura de QR Code permita acesso público ao cadastro.
- Validar a autorização do responsável no momento da retirada.
- Preparar o sistema para sessões seguras, autenticação e autorização no servidor.

Utilizar exclusivamente dados fictícios durante o desenvolvimento e as demonstrações.

## 17. Etapas de desenvolvimento

Desenvolver na seguinte ordem:

**Etapa 1 — Estrutura visual:** criar o layout principal, menu lateral, cabeçalho, sistema de cores e componentes reutilizáveis.

**Etapa 2 — Dashboard:** construir os indicadores, gráficos e listas operacionais.

**Etapa 3 — Cadastros:** implementar as telas de crianças, famílias, responsáveis e turmas.

**Etapa 4 — Crachás:** construir o layout de impressão e a interface de leitura de QR Code, utilizando simulações nesta etapa.

**Etapa 5 — Operação:** desenvolver os fluxos de entrada, saída e chamadas aos responsáveis.

**Etapa 6 — Administração:** desenvolver relatórios, notificações, usuários, permissões e configurações.

**Etapa 7 — Integração futura:** organizar os contratos de API e os pontos de integração necessários para backend, banco de dados e aplicativo mobile.

## 18. Critérios de conclusão

O resultado deve ser um front-end navegável, com aparência de produto real e fluxos demonstráveis de ponta a ponta.

Não entregar apenas imagens, wireframes ou telas estáticas.

Os menus, botões, filtros, formulários, modais, tabelas e ações principais devem funcionar no ambiente de demonstração.

Utilizar dados fictícios coerentes para que seja possível demonstrar o cadastro de uma família com várias crianças, a geração de crachás, a entrada de uma criança, uma chamada ao responsável e a retirada autorizada.

Não implementar funcionalidades de backend ou envio de notificações reais nesta fase sem uma solicitação específica.

Ao concluir, apresentar a estrutura criada, as telas implementadas, como executar o projeto e quais integrações serão necessárias na próxima etapa.