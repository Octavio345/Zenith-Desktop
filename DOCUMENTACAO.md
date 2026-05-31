# Documentacao Tecnica - Zenith Desktop

## 1. Visao Geral

O Zenith Desktop e uma aplicacao web/PWA voltada para gestao agricola. O sistema centraliza informacoes do produtor e da fazenda, oferece diagnostico de doencas em soja por imagem, clima, diario de campo, mapa para demarcacao de areas, controle de estoque e atividades operacionais.

O projeto foi construido em React com Vite e usa Firebase para autenticacao e persistencia principal. Algumas funcionalidades usam armazenamento local do navegador, APIs externas e IndexedDB.

## 2. Stack Principal

- React 18: interface e componentes.
- Vite: ambiente de desenvolvimento e build.
- React Router DOM: roteamento.
- Firebase Authentication: login e sessao do usuario.
- Firebase Firestore: dados do usuario e fazendas.
- Vite PWA: manifest, service worker e instalacao como aplicativo.
- Framer Motion: animacoes.
- Leaflet e Leaflet Draw: mapa e demarcacao de areas.
- OpenWeatherMap: dados climaticos.
- API de ML no Hugging Face: diagnostico de doencas da soja.
- IndexedDB/localStorage: historicos e dados locais de algumas telas.

## 3. Como Rodar o Projeto

Instale as dependencias:

```bash
npm install
```

Rode em desenvolvimento:

```bash
npm run dev
```

Gerar build de producao:

```bash
npm run build
```

Visualizar build local:

```bash
npm run preview
```

## 4. Estrutura de Pastas

```text
src/
  App.jsx
  main.jsx
  services/
    firebase.js
    sojaApi.js
    weatherService.js
    DiagnosisDB.js
  hooks/
    useDiagnosisDB.js
  pages/App/
    Intro.jsx
    Login.jsx
    Register.jsx
    CadastroCompleto.jsx
    CadastroFazenda.jsx
    Home.jsx
    Explore.jsx
    Profile.jsx
    ForgotPassword.jsx
  components/App/
    Global/
    Home/
    Explore/
    Profile/
  styles/
    Global/
    App/
```

### Pastas principais

- `src/pages/App`: telas principais roteadas.
- `src/components/App/Global`: componentes globais como header, menu, splash e select customizado.
- `src/components/App/Home`: componentes especificos da Home.
- `src/components/App/Explore`: abas de servicos.
- `src/components/App/Profile`: perfil pessoal e dados da fazenda.
- `src/services`: integracoes externas e persistencia.
- `src/styles`: CSS organizado por area.

## 5. Rotas

As rotas estao em `src/App.jsx`.

| Rota | Tela | Funcao |
|---|---|---|
| `/` | `Intro` | Tela inicial/entrada |
| `/login` | `Login` | Autenticacao |
| `/register` | `CadastroCompleto` | Cadastro completo |
| `/home` | `Home` | Dashboard principal |
| `/explore` | `Explore` | Servicos do sistema |
| `/profile` | `Profile` | Perfil pessoal e fazenda |
| `/forgot-password` | `ForgotPassword` | Recuperacao de senha |

## 6. Fluxo Geral do App

1. Usuario acessa `Login`.
2. Firebase Authentication valida a sessao.
3. A Home busca:
   - dados do usuario em `users`;
   - primeira fazenda vinculada ao usuario em `farms`;
   - clima pela cidade/UF da fazenda.
4. O usuario navega entre Home, Servicos e Perfil.
5. A navegacao principal usa uma tela de carregamento rapida (`SplashScreen`) para padronizar transicoes.

## 7. Firebase

Arquivo:

```text
src/services/firebase.js
```

Ele inicializa:

- `auth`: Firebase Authentication.
- `db`: Firestore.

### Colecoes usadas

#### `users`

Guarda dados do usuario/produtor.

Campos esperados:

```js
{
  name,
  age,
  type,          // CPF ou PJ
  document,
  hectares,
  profileIcon,
  phone,
  city,
  state,
  email,
  createdAt,
  updatedAt
}
```

Observacao: no fluxo atual, a localizacao pessoal deixou de ser destaque visual e os dados de cidade/UF mais importantes ficam na fazenda.

#### `farms`

Guarda dados da fazenda.

Campos esperados:

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

### Ponto critico

As credenciais do Firebase estao hardcoded em `firebase.js`. Para um projeto mais profissional, o ideal e migrar para variaveis de ambiente:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
...
```

## 8. Home

Arquivo principal:

```text
src/pages/App/Home.jsx
```

Componentes:

- `WelcomeSection`: saudacao e CTA.
- `ModulesSidebar`: navegacao lateral para os servicos.
- `MetricsGrid`: metricas do clima, drone e fazenda.
- `ActivitiesList`: atividades recentes/atalhos.
- `ProfileSidebar`: resumo do perfil e da fazenda.
- `AppHeader` e `MenuBar`: navegacao global.

### Dados exibidos

A Home usa `onAuthStateChanged` para obter o usuario atual e busca:

- documento do usuario em `users`;
- fazenda em `farms` usando `ownerId`;
- clima pela fazenda com `getWeatherByCity`.

## 9. Servicos / Explore

Arquivo:

```text
src/pages/App/Explore.jsx
```

Abas:

- Diagnostico
- Clima
- Diario
- Mapa
- Estoque
- Atividades

A aba ativa e salva em `localStorage` com a chave:

```text
activeExploreTab
```

Tambem e possivel navegar para uma aba especifica usando `location.state`, por exemplo:

```js
navigate("/explore", { state: { activeTab: "atividades" } })
```

## 10. Diagnostico por IA

Arquivo principal:

```text
src/components/App/Explore/Diagnostico/DiagnosticoTab.jsx
```

API:

```text
https://tccamsamericana-api-doencas-soja.hf.space/predict
```

Fluxo:

1. Usuario seleciona imagem pela galeria ou camera.
2. Imagem e convertida para `Blob`.
3. O sistema envia `FormData` com o campo `file`.
4. API retorna resultado com status, diagnostico, confianca e probabilidades.
5. Resultados validos sao salvos no historico local.

Historico local:

```text
localStorage["diagnosticHistory"]
```

### Tratamento de imagem fora do dominio

A API pode retornar status como:

- `fora_do_dominio`
- `baixa_qualidade`
- `baixa_confianca`
- `classes_proximas`
- `ok`

O front deve diferenciar resultado positivo de mensagens inconclusivas/fora de soja.

## 11. Banco Local de Diagnosticos

Arquivos:

```text
src/services/DiagnosisDB.js
src/hooks/useDiagnosisDB.js
```

Usa IndexedDB com:

- database: `FarmDiagnosisDB`
- versao: `2`
- store: `diagnoses`
- store: `settings`

Suporta:

- salvar diagnostico;
- atualizar;
- deletar;
- buscar por doenca;
- filtros avancados;
- estatisticas;
- export/import.

Observacao: parte do diagnostico atual usa `localStorage`; o IndexedDB existe como camada mais robusta e pode ser padronizado no futuro.

## 12. Clima

Arquivo:

```text
src/services/weatherService.js
```

Usa OpenWeatherMap:

```text
https://api.openweathermap.org/data/2.5/weather
```

Entrada:

```js
getWeatherByCity(city, state)
```

Retorno:

```js
{
  temperature,
  humidity
}
```

Ponto critico: a chave da API esta hardcoded. O ideal e migrar para:

```text
VITE_OPENWEATHER_API_KEY
```

## 13. Mapa

Arquivo:

```text
src/components/App/Explore/MapaTab.jsx
```

Bibliotecas:

- Leaflet
- Leaflet Draw

Responsabilidades:

- localizar fazenda/endereco;
- desenhar poligonos no mapa;
- calcular hectares;
- salvar areas demarcadas;
- nomear areas;
- selecionar/remover areas.

Pontos de atencao:

- A area calculada depende da geometria desenhada no mapa.
- Para validar hectares de forma juridica/oficial, seria necessario comparar com dados georreferenciados oficiais ou ferramentas GIS profissionais.
- Existe erro conhecido de console vindo de `leaflet-draw` em algumas interacoes de medida (`ReferenceError: type is not defined`). Se voltar a quebrar a edicao do mapa, investigar sobrescrita de `L.GeometryUtil.readableArea`.

## 14. Diario de Campo

Arquivo:

```text
src/components/App/Explore/DiarioTab.jsx
```

Funcionalidades:

- criar registros;
- buscar por titulo/descricao;
- filtrar por tipo;
- excluir com confirmacao;
- ver resumo de registros, tratamentos, irrigacoes e alertas.

Persistencia:

```text
localStorage["diaryEntries"]
```

## 15. Estoque

Arquivo:

```text
src/components/App/Explore/EstoqueTab.jsx
```

Funcionalidades:

- cadastrar produto;
- editar produto;
- excluir produto;
- controlar categoria, unidade, quantidade, estoque minimo, validade e fornecedor;
- cards de resumo.

Persistencia: local no estado/comportamento do componente. Se precisar manter dados entre sessoes de forma robusta, mover para Firestore ou localStorage padronizado.

## 16. Atividades

Arquivo:

```text
src/components/App/Explore/AtividadesTab.jsx
```

Funcionalidades:

- criar atividade;
- editar;
- filtrar por tipo/status;
- controlar prioridade, responsavel, data/hora e status;
- marcar como iniciada/concluida;
- excluir.

Tipos atuais:

- Tarefa
- Voo de Drone
- Irrigacao
- Pulverizacao
- Colheita
- Manutencao

## 17. Perfil

Arquivo principal:

```text
src/pages/App/Profile.jsx
```

Componentes:

- `ProfileHeader`
- `ProfileStatsRow`
- `ProfileActions`
- `ProfileTabs`
- `PersonalInfoView`
- `ProfileEditForm`
- `FarmInfoView`
- `FarmEditForm`

### Abas

- `Pessoal`: dados do produtor.
- `Fazenda`: dados da propriedade.

### Edicao de perfil pessoal

Campos:

- nome;
- idade;
- telefone;
- email exibido como campo bloqueado;
- tipo CPF/PJ;
- CPF/CNPJ;
- icone do perfil.

### Edicao da fazenda

Campos:

- nome da fazenda;
- area total;
- cultura;
- CEP opcional;
- municipio;
- UF;
- bairro;
- data de aquisicao;
- telefone da fazenda;
- tipo de proprietario.

Se o CEP tiver 8 digitos, o sistema tenta buscar endereco pela API ViaCEP:

```text
https://viacep.com.br/ws/{cep}/json/
```

Se o CEP nao for encontrado, o usuario pode preencher cidade e UF manualmente.

## 18. Componentes Globais

### `AppHeader`

Arquivo:

```text
src/components/App/Global/AppHeader.jsx
```

Header desktop/mobile com links para:

- Inicio
- Servicos
- Perfil

Tambem dispara a splash rapida de navegacao.

### `MenuBar`

Arquivo:

```text
src/components/App/Global/MenuBar.jsx
```

Navegacao inferior usada em layouts menores.

### `SplashScreen`

Arquivo:

```text
src/components/App/Global/SplashScreen.jsx
```

Tela de carregamento padronizada. Usa icone Material Symbols, sem emojis.

### `CustomSelect`

Arquivo:

```text
src/components/App/Global/CustomSelect.jsx
```

Dropdown customizado usado no lugar de `<select>` nativo para melhorar o visual.

Regras importantes:

- Nao mostra a opcao atualmente selecionada dentro do menu aberto.
- Nao mostra placeholder com `value: ""` dentro do menu aberto.
- Quando recebe `name`, dispara `onChange` no formato parecido com evento:

```js
onChange({ target: { name, value } })
```

## 19. PWA e Deploy

Arquivo:

```text
vite.config.js
```

Usa `vite-plugin-pwa` com:

- `registerType: "autoUpdate"`
- `skipWaiting: true`
- `clientsClaim: true`
- `cleanupOutdatedCaches: true`

Arquivo:

```text
vercel.json
```

Configura:

- build: `npm run build`
- output: `dist`
- rewrite para SPA:

```json
{ "source": "/(.*)", "destination": "/" }
```

### Cache/Service Worker

Como o projeto e PWA, alteracoes visuais podem ficar presas no cache do navegador/service worker. Em testes, se uma tela antiga aparecer:

1. limpar cache do navegador;
2. unregister do service worker nas DevTools;
3. recarregar com hard reload;
4. gerar novo build.

## 20. Variaveis e Seguranca

Hoje existem chaves hardcoded:

- Firebase em `src/services/firebase.js`;
- OpenWeatherMap em `src/services/weatherService.js`;
- API de diagnostico em `DiagnosticoTab.jsx` e `sojaApi.js`.

Recomendacao:

```text
.env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_OPENWEATHER_API_KEY=
VITE_SOJA_API_URL=
```

E usar no codigo:

```js
import.meta.env.VITE_SOJA_API_URL
```

## 21. Pontos de Manutencao e Riscos

### 1. Arquivos `.jsx.txt`

Existem arquivos duplicados com extensao `.jsx.txt` dentro de:

```text
src/components/App/Explore/Diagnostico/
```

Eles nao devem ser importados pelo app. Sao provaveis backups/copias antigas. Recomenda-se remover ou mover para uma pasta de backup fora de `src`.

### 2. Textos com encoding quebrado

Alguns arquivos exibem caracteres quebrados como `InformaÃ§Ãµes`. Isso indica problema de encoding. O ideal e padronizar tudo em UTF-8.

### 3. Dados locais espalhados

O projeto usa uma mistura de:

- Firestore;
- localStorage;
- IndexedDB;
- estado local.

Para evoluir o sistema, escolher uma estrategia clara:

- dados do produtor/fazenda: Firestore;
- historicos importantes: Firestore ou IndexedDB com backup;
- preferencias visuais e aba ativa: localStorage.

### 4. Logs de desenvolvimento

Ha varios `console.log` em telas como Explore. Antes de producao, reduzir logs ou deixar somente logs realmente uteis.

### 5. API de ML

Se a API do Hugging Face dormir, demorar ou cair, o front pode mostrar erro de analise. Para melhorar:

- exibir timeout amigavel;
- manter endpoint configuravel por `.env`;
- registrar falhas;
- diferenciar erro de rede, imagem invalida e baixa confianca.

## 22. Checklist para Novo Desenvolvedor

1. Rodar `npm install`.
2. Rodar `npm run dev`.
3. Testar login/cadastro com Firebase.
4. Verificar se as colecoes `users` e `farms` estao sendo criadas.
5. Testar `/home`, `/explore` e `/profile`.
6. Testar diagnostico com imagem real de soja e imagem fora do dominio.
7. Testar mapa criando, nomeando e removendo areas.
8. Testar edicao da fazenda com CEP valido e CEP inexistente.
9. Rodar `npm run build`.
10. Se houver comportamento antigo, limpar cache/service worker.

## 23. Comandos Uteis

Desenvolvimento:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview:

```bash
npm run preview
```

Buscar arquivos:

```bash
rg "texto"
rg --files src
```

## 24. Proximas Melhorias Recomendadas

1. Migrar chaves para `.env`.
2. Corrigir encoding dos arquivos.
3. Remover arquivos `.jsx.txt`.
4. Padronizar persistencia de Estoque, Diario e Atividades.
5. Criar testes basicos para fluxos principais.
6. Criar camada unica para APIs externas.
7. Melhorar tratamento offline/PWA.
8. Criar validacoes de formulario mais fortes.
9. Separar estilos muito grandes em componentes menores.
10. Reduzir bundle com code splitting.
