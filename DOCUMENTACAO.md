# Documentação técnica

## Visão geral

O Zenith é uma SPA feita em React e Vite, com Firebase Authentication e Firestore. A aplicação tem três áreas principais:

- acesso e cadastro;
- operação agrícola;
- perfil e gestão de equipe.

O proprietário administra fazenda, funcionários, tarefas e atividades. O funcionário vê apenas o que foi destinado a ele, registra a jornada e atualiza o andamento das próprias tarefas. A autorização real fica nas regras do Firestore; a interface só complementa essa proteção.

## Produto e inteligência de visão computacional

O produto combina gestão operacional com análise visual da lavoura. A camada de IA recebe imagens e devolve resultados estruturados para a interface; o objetivo não é apenas exibir uma previsão, mas registrar o contexto da análise, relacioná-lo ao talhão e apoiar a decisão no fluxo de trabalho da fazenda.

O Zenith expõe três serviços visuais:

| Serviço | Entrada | Resultado operacional |
| --- | --- | --- |
| Diagnóstico de soja e trigo | um lote de até 100 imagens de uma cultura | leitura de condição, confiança e indicadores retornados pela API |
| Monitoramento de plantio | imagem de campo ou aérea | cobertura, uniformidade, alinhamento e indicadores de falhas quando disponíveis |
| Reconstrução 3D | de 2 a 40 fotografias | criação de tarefa de processamento e link de visualização do modelo |

Os serviços são integrados por `src/services/diagnosticoApi.js`, `src/services/monitoramentoService.js` e `src/services/modelo3dApi.js`. A interface trata timeout, erro de rede e respostas não conclusivas para evitar apresentar um diagnóstico indefinido como certeza.

Os resultados devem ser usados como apoio à vistoria. A plataforma não emite laudo agronômico, não substitui avaliação presencial e não deve ser usada como única base para aplicação de defensivos ou decisão financeira.

## Arquitetura da aplicação

O Zenith é uma aplicação cliente: React renderiza a interface no navegador, Firebase concentra autenticação e dados operacionais, e serviços externos fornecem análise visual, clima, endereço e camadas de mapa. Toda integração acessada pelo navegador precisa aceitar CORS e tratar indisponibilidade de rede.

| Camada | Responsabilidade | Tecnologia principal |
| --- | --- | --- |
| Interface | telas, rotas, formulários e experiência desktop | React 18, React Router e Vite |
| Dados e acesso | login, perfis, equipe, tarefas e atividades em tempo real | Firebase Authentication e Firestore |
| Visão computacional | diagnóstico de soja e trigo, plantio e geração 3D | APIs HTTP configuráveis |
| Mapa | visualização, geocodificação, desenho, cálculo e inspeção 3D de talhões | Leaflet, Leaflet Draw, ArcGIS Maps SDK, Esri e OpenStreetMap |
| Dados locais | itens que ainda não são sincronizados entre dispositivos | `localStorage` e IndexedDB |
| Instalação | versão instalável e cache do navegador | `vite-plugin-pwa` |

Essa separação é importante para manutenção: o front não deve guardar segredos e não deve assumir que uma API externa estará sempre disponível. Cada módulo mostra um retorno seguro quando o serviço não responde.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
```

O build é gerado em `dist`. A Vercel usa `vercel.json` para o fallback de rotas da SPA e para a rota de retorno do Firebase Authentication.

## Rotas e acesso

As rotas ficam em `src/App.jsx`.

| Rota | Acesso |
| --- | --- |
| `/`, `/login`, `/register`, `/forgot-password` | público |
| `/cadastrar-fazenda`, `/home`, `/profile`, `/explore` | usuário autenticado e ativo |
| `/equipe`, `/admin/team` | proprietário/gestor com e-mail confirmado |

`AccountRoute` monitora o documento do usuário. Quando `archived` é `true` ou `accessStatus` é `blocked`, a sessão é encerrada e a pessoa é enviada ao login.

`TeamRoute` também confere `emailVerified`. A confirmação é enviada no cadastro do proprietário e pode ser reenviada na tela de bloqueio da equipe.

## Papéis

Os papéis são definidos em `src/services/accessControl.js`.

| Papel | Valor salvo | Uso |
| --- | --- | --- |
| Proprietário/gestor | `admin` | administra fazenda, equipe, tarefas e atividades |
| Funcionário | `employee` | acessa jornada e tarefas próprias |
| Colaborador | `collaborator` | segue o mesmo fluxo operacional do funcionário |

O bloqueio de funcionário não exclui a conta fisicamente. O painel marca o perfil assim:

```js
{
  archived: true,
  accessStatus: "blocked",
  archivedAt: "..."
}
```

Ele desaparece da equipe e perde acesso ao sistema, mas o histórico continua no Firebase.

## Dados no Firestore

### `users/{uid}`

Perfil, papel, vínculo e status do usuário.

```js
{
  name,
  email,
  role: "admin" | "employee" | "collaborator",
  ownerId,
  teamId,
  archived,
  accessStatus,
  phone,
  document,
  age,
  type,
  employmentType,
  position,
  sector,
  status,
  entry,
  exit,
  hours,
  createdAt,
  updatedAt
}
```

Em contas de equipe, `ownerId` e `teamId` apontam para o UID do proprietário.

### `farms/{farmId}`

Dados da propriedade, sempre vinculados por `ownerId`.

```js
{
  ownerId,
  name,
  area_total,
  plantacao,
  municipio,
  uf,
  bairro,
  cep,
  data_aquisicao,
  telefone,
  tipo_proprietario,
  createdAt,
  updatedAt
}
```

### `tasks/{taskId}`

Tarefa individual criada no painel Equipe.

```js
{
  ownerId,
  employeeId,
  title,
  due,
  status: "pendente" | "andamento" | "concluida",
  startedAt,
  completedAt,
  ownerConfirmedAt,
  createdAt,
  updatedAt
}
```

O funcionário inicia e conclui apenas itens próprios. O proprietário confirma a finalização. Depois da confirmação, o item deixa de aparecer na interface após duas horas; a regra está em `src/services/workItemLifecycle.js`.

### `activities/{activityId}`

Atividades criadas na aba Atividades. Podem ser gerais ou destinadas a uma pessoa.

```js
{
  ownerId,
  scope: "general" | "individual",
  assigneeId,
  title,
  description,
  type,
  priority,
  date,
  time,
  status,
  startedAt,
  completedAt,
  ownerConfirmedAt,
  createdAt,
  updatedAt
}
```

Atividades `general` são lidas pela equipe vinculada à fazenda. Atividades `individual` são lidas pelo proprietário e pelo funcionário indicado em `assigneeId`.

## Regras do Firestore

`firestore.rules` cobre as coleções de usuários, fazendas, tarefas e atividades. Em resumo:

- administrador cria o próprio perfil;
- administrador com e-mail confirmado cria e edita a própria equipe;
- funcionário atualiza apenas a própria jornada e tarefas destinadas a ele;
- proprietário controla tarefas e atividades da própria equipe;
- exclusão física de perfis pelo cliente não é permitida;
- qualquer coleção não declarada fica bloqueada.

Para publicar as regras:

```bash
firebase use zenith-agro
firebase deploy --only firestore:rules
```

Se o projeto Firebase tiver outro nome, use o nome correto no primeiro comando.

## Fluxos importantes

### Proprietário

1. Cria a conta em `/register`.
2. O perfil é gravado com `role: "admin"`.
3. Recebe o e-mail de confirmação.
4. Cadastra a fazenda em `/cadastrar-fazenda`.
5. Depois de confirmar o e-mail, pode abrir `/equipe` e criar acessos de funcionário.

### Funcionário

1. Recebe um login criado pelo proprietário.
2. Entra escolhendo o modo Funcionário.
3. Na Home, registra entrada e saída.
4. Recebe tarefas individuais e atividades gerais em tempo real.
5. Inicia, finaliza e aguarda a confirmação do proprietário.

### Criação de funcionário

O painel usa uma instância secundária do Firebase Auth para criar a nova conta sem derrubar a sessão do proprietário. O perfil do funcionário é salvo em `users` com `ownerId`, `teamId` e papel operacional.

## Módulos

| Módulo | O que entrega | Arquivo principal | Persistência |
| --- | --- | --- |
| Diagnóstico | envio de fotos, leitura visual, histórico e ocorrência para vistoria | `components/App/Explore/Diagnostico/DiagnosticoTab.jsx` | IndexedDB, `localStorage` e API externa |
| Plantio | leitura de cobertura, uniformidade, fileiras e falhas | `components/App/Explore/Monitoramento/` | API externa |
| Clima | condições atuais e previsão da cidade da fazenda | `components/App/Explore/ClimaTab.jsx` | OpenWeatherMap |
| Diário | registro manual de acontecimentos no campo | `components/App/Explore/DiarioTab.jsx` | `localStorage["diaryEntries"]` |
| Mapa | localização, talhões, áreas, ocorrências, demarcação 2D e inspeção 3D | `components/App/Explore/MapaTab.jsx` | `localStorage["farmPolygons"]` e APIs de mapa |
| Estoque | produtos, quantidade e movimentações da operação | `components/App/Explore/EstoqueTab.jsx` | `localStorage["inventory"]` |
| Atividades | atividades gerais e individuais da fazenda | `components/App/Explore/AtividadesTab.jsx` | Firestore, em tempo real |
| Legislação | orientação operacional e links oficiais para uso de drones agrícolas | `components/App/Explore/LegislacaoDronesTab.jsx` | conteúdo estático e canais oficiais |

### Mapa, talhões e localização

O mapa é a referência espacial da fazenda. Ele serve para localizar a propriedade, desenhar a borda real de cada talhão, calcular sua área e contextualizar ocorrências vindas do diagnóstico. Essa ligação permite saber em qual área uma imagem foi analisada antes de levar a demanda para vistoria.

O fluxo do módulo é:

1. A pessoa pesquisa CEP, endereço, cidade/UF ou nome da fazenda.
2. O sistema tenta obter coordenadas confiáveis e centraliza o mapa no local encontrado.
3. Com a imagem de satélite como referência, a pessoa desenha um polígono para cada talhão ou área operacional. Cada polígono aceita quantos vértices forem necessários e o mapa impede cruzamento de bordas.
4. O Zenith calcula a área em hectares, permite renomear e editar os vértices do polígono.
5. Diagnósticos associados a um talhão são mostrados como ocorrências que aguardam vistoria.

Cada área salva tem, no mínimo, este formato local:

```js
{
  id,
  name,
  color,
  coordinates: [[latitude, longitude]],
  areaHa,
  createdAt
}
```

O cálculo prioriza a área geodésica disponibilizada pelo Leaflet. Caso ela não esteja disponível, há uma aproximação em metros baseada nas coordenadas do polígono. Por isso, o valor é uma referência operacional: a demarcação técnica ou legal da propriedade deve continuar sendo feita por profissional habilitado e base oficial.

O módulo oferece dois mapas-base: imagem de satélite da Esri e mapa de ruas do OpenStreetMap. Também pode usar a geolocalização do navegador quando a pessoa autoriza o acesso. Essa permissão pertence ao navegador/dispositivo e pode ser recusada pelo usuário.

#### Modos 2D e 3D

O mapa abre em **2D**, que é o modo destinado à demarcação e à edição das bordas. A ferramenta usa Leaflet Draw porque a visão vertical facilita posicionar os vértices sobre os limites visíveis na imagem de satélite. Ao finalizar, o polígono é salvo localmente em `farmPolygons` e fica disponível para diagnósticos e para o 3D.

O **3D** é uma visualização complementar com ArcGIS `SceneView`, imagem de satélite e terreno reais. Ele não cria nem edita talhões: sua finalidade é inspecionar a lavoura, o relevo e os limites já demarcados. Ao entrar no 3D, o enquadramento prioriza a área selecionada; sem seleção, enquadra o conjunto de áreas; sem áreas, preserva a região atual do mapa 2D. A câmera abre com inclinação de 45° e os polígonos ficam aderidos ao terreno, sem extrusão.

O módulo ArcGIS é carregado somente quando o modo 3D é aberto. Ao voltar ao 2D, o centro aproximado da câmera é reaproveitado para preservar o contexto. Navegadores ou dispositivos sem suporte ao 3D recebem uma mensagem de indisponibilidade e podem continuar no 2D.

### Legislação de drones

A aba **Legislação** fica no Explorer e está disponível tanto para proprietário quanto para funcionários. Ela funciona como uma referência rápida para a preparação de missões agrícolas, sem substituir a consulta oficial nem a avaliação da operação.

O conteúdo distingue as responsabilidades de cada órgão:

- **ANAC:** regras civis, cadastro e responsabilidades do operador;
- **DECEA / SARPAS:** acesso ao espaço aéreo e autorizações de voo;
- **Anatel:** homologação dos itens de radiofrequência, como controle, telemetria e transmissão.

A aba inclui links externos oficiais. Como normas e procedimentos podem mudar, a interface não considera seu texto uma autorização de voo: a equipe deve conferir as condições vigentes antes de cada operação.

### Integrações e APIs

| Integração | Requisição usada pelo Zenith | Finalidade | Onde está integrada |
| --- | --- | --- | --- |
| API de diagnóstico de soja e trigo | `POST /culturas/{cultura}/predict/batch`, com `FormData` | analisa fotos de uma cultura por lote | `services/diagnosticoApi.js` |
| API de monitoramento de plantio | `POST /analyze`, com `FormData` no campo `file` | devolve cobertura, uniformidade, fileiras, falhas e imagens de sobreposição quando disponíveis | `services/monitoramentoService.js` |
| API de reconstrução 3D | `POST /webodm/tasks`, `GET /webodm/tasks/:id` e rota de visualização | cria e acompanha o processamento de 2 a 40 fotografias | `services/modelo3dApi.js` |
| OpenWeatherMap | `GET /data/2.5/weather` e `GET /data/2.5/forecast` | clima atual e previsão por cidade e UF | `services/weatherService.js` e `ClimaTab.jsx` |
| BrasilAPI CEP | `GET /api/cep/v2/:cep` | primeira tentativa de endereço e coordenadas por CEP | `MapaTab.jsx` |
| AwesomeAPI CEP | `GET /json/:cep` | segunda tentativa de coordenadas por CEP | `MapaTab.jsx` |
| ViaCEP | `GET /ws/:cep/json/` | endereço por CEP para cadastro e busca geográfica | cadastro de fazenda, cadastro completo e mapa |
| Nominatim / OpenStreetMap | `GET /search` | geocodifica endereço, cidade ou resultado do CEP | `MapaTab.jsx` |
| Esri World Imagery | tiles XYZ | imagem de satélite para desenhar as áreas | `MapaTab.jsx` |
| ArcGIS Maps SDK | `SceneView`, `world-elevation` e satélite | visualização 3D opcional de talhões e terreno | `FarmMap3D.jsx` |
| OpenStreetMap tiles | tiles XYZ | alternativa de mapa de ruas | `MapaTab.jsx` |

As URLs das três APIs de visão computacional podem ser alteradas sem editar o código pelo arquivo `.env`:

```env
VITE_DIAGNOSTICO_API_URL=https://seu-endpoint-de-diagnostico
VITE_MONITORAMENTO_API_URL=https://seu-endpoint-de-plantio/analyze
VITE_MODELO_3D_API_URL=https://seu-endpoint-3d
VITE_ARCGIS_API_KEY=sua-chave-publica-do-arcgis
```

Sem essas variáveis, o sistema usa as URLs padrão definidas nos respectivos arquivos de serviço. Em produção, o servidor das APIs precisa liberar o domínio da aplicação no CORS. Variáveis iniciadas por `VITE_` ficam visíveis no navegador.

### Operação, equipe e rotina de campo

**Home.** É o painel operacional. Carrega o perfil, a fazenda vinculada e o clima pela cidade/UF cadastrada. Para funcionários, mantém uma assinatura em tempo real das tarefas individuais e das atividades recebidas. A partir daí, registra entrada, saída, início e conclusão de itens de trabalho.

**Perfil e fazenda.** O proprietário edita informações pessoais e os dados da propriedade. O CEP é consultado no ViaCEP para completar endereço. Funcionários não recebem os controles administrativos de plano e de edição de perfil do proprietário.

**Equipe.** O administrador cria o acesso de cada funcionário, completa o cadastro trabalhista e acompanha jornada, tarefas, atividades e status. A criação usa uma segunda instância do Firebase Auth para não encerrar a sessão de quem está cadastrando. A remoção atual bloqueia e arquiva o perfil no Firestore; não apaga a conta do Firebase Authentication nem o histórico operacional.

**Tarefas e atividades.** Há dois tipos de trabalho no sistema:

- `tasks`: tarefa individual criada pelo painel Equipe para um funcionário específico;
- `activities`: atividade criada no Explorer, podendo ser `general` para toda a fazenda ou `individual` para um responsável.

O funcionário pode iniciar e concluir apenas o que recebeu. Depois da conclusão, o proprietário confirma a finalização. Itens confirmados deixam de ser exibidos nas interfaces após duas horas, mas continuam registrados no Firestore.

**Diário e estoque.** São módulos locais no estágio atual. O diário registra lançamentos de campo e o estoque organiza produtos e quantidades no navegador do usuário. Eles funcionam sem uma API própria, mas não devem ser considerados uma base compartilhada entre computadores até serem migrados para Firestore ou outro banco central.

### Onde cada dado fica salvo

| Recurso | Chave ou base | Escopo atual | Consequência prática |
| --- | --- | --- | --- |
| Perfil, fazenda, equipe, tarefas e atividades | Firestore | conta/equipe | sincronizado e protegido pelas regras |
| Diagnósticos estruturados | IndexedDB `FarmDiagnosisDB` | navegador | histórico não acompanha outro dispositivo automaticamente |
| Histórico resumido de diagnóstico | `localStorage["diagnosticHistory"]` | navegador | pode ser apagado ao limpar os dados do navegador |
| Ocorrências por talhão | `localStorage["zenithFieldOccurrences"]` | navegador | o mapa só mostra ocorrências criadas naquele navegador |
| Polígonos e talhões | `localStorage["farmPolygons"]` | navegador | áreas desenhadas não são compartilhadas nem têm backup remoto |
| Diário | `localStorage["diaryEntries"]` | navegador | registros não são compartilhados entre usuários |
| Estoque | `localStorage["inventory"]` | navegador | saldo não é centralizado entre dispositivos |
| Rascunho de atividade | `localStorage["zenithActivityDraft"]` | navegador | preserva formulário em edição localmente |
| Última tarefa 3D | `localStorage["zenith:lastModelo3DTask"]` | navegador | ajuda a retomar a visualização local |

Para tornar o mapa, diário, estoque e histórico de diagnóstico corporativos, o próximo passo técnico é modelar coleções no Firestore por fazenda, atualizar as regras e migrar os registros locais. Isso é uma evolução de produto; não basta copiar `localStorage` para o banco sem definir proprietário, permissões, índices e estratégia de migração.

### Diagnóstico, plantio e 3D

Endpoints configuráveis:

```env
VITE_DIAGNOSTICO_API_URL=
VITE_MONITORAMENTO_API_URL=
VITE_MODELO_3D_API_URL=
```

- `src/services/diagnosticoApi.js` envia o lote para a rota da cultura escolhida (`soja` ou `trigo`). O tempo limite da requisição é de cinco minutos e a interface permite cancelar a análise.
- `src/services/monitoramentoService.js` aceita JPG, PNG ou WebP de até 50 MB. O tempo limite é de 40 segundos; respostas antigas e novas da API são normalizadas antes de chegar à interface.
- `src/services/modelo3dApi.js` cria tarefas de reconstrução 3D com 2 a 40 imagens, consulta o status da tarefa e monta a URL do visualizador. O envio pode durar até 30 minutos antes de ser interrompido pelo navegador.

#### Fluxo de uma análise

1. A pessoa envia a imagem pela galeria ou por uma captura feita no campo.
2. O front valida o arquivo e envia `FormData` ao serviço correspondente.
3. A API responde com dados de análise ou uma condição de falha.
4. A interface apresenta o resultado de forma legível e pode registrar uma ocorrência para vistoria.
5. O histórico fica disponível para comparação e acompanhamento da operação.

No diagnóstico de soja e trigo, respostas como baixa qualidade e baixa confiança devem ser tratadas como orientação para repetir a captura ou fazer vistoria — nunca como resultado conclusivo. O filtro adicional de domínio se aplica apenas à soja.

### Clima

O clima é consultado com a cidade e a UF da fazenda pelas integrações do OpenWeatherMap em `src/services/weatherService.js` e `ClimaTab.jsx`.

### Dados locais

Diário, estoque, áreas do mapa e parte do histórico de diagnóstico permanecem no navegador. Eles não são sincronizados automaticamente entre computadores. Antes de depender deles como dado operacional definitivo, migre o módulo para Firestore ou implemente exportação e backup.

## Variáveis de ambiente

O repositório ignora `.env`; `.env.example` é o exemplo versionado. Para desenvolvimento local, crie `.env` com:

```env
VITE_DIAGNOSTICO_API_URL=
VITE_MONITORAMENTO_API_URL=
VITE_MODELO_3D_API_URL=
VITE_ARCGIS_API_KEY=
VITE_ZENITH_PHONE=
VITE_ZENITH_EMAIL=
VITE_ZENITH_INSTAGRAM=
```

Variáveis `VITE_` são públicas no bundle. Não coloque senhas, chaves administrativas ou credenciais de servidor nesse arquivo. A `VITE_ARCGIS_API_KEY` é usada apenas pelas APIs de mapa no navegador e deve ser restringida por domínio no ArcGIS Location Platform.

## PWA e cache

O service worker é configurado em `vite.config.js`. Se uma publicação continuar exibindo uma tela antiga:

1. faça hard reload;
2. teste em janela anônima;
3. remova o service worker antigo nas DevTools, se necessário;
4. gere e publique novo build.

## Checklist de publicação

1. Execute `npm run build`.
2. Publique regras do Firestore quando houver alteração em permissões.
3. Revise domínios autorizados no Firebase Authentication.
4. Teste gestor e funcionário em sessões separadas.
5. Teste confirmação de e-mail, criação de equipe, bloqueio de acesso, jornada, tarefa e confirmação de conclusão.
6. Teste cache do PWA em produção.

## Pontos de atenção

- A configuração Firebase ainda está em `src/services/firebase.js`; para ambientes diferentes, atualize esse arquivo de forma consciente.
- O bundle de produção é grande. Quando necessário, use `React.lazy` e imports dinâmicos para dividir módulos pesados por rota.
- Não trate a interface como mecanismo de segurança: alterações de permissão exigem revisão de `firestore.rules`.
