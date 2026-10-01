# Arquitetura — Broadcast

## Objetivo

Definir a base de domínio de um SaaS multi-tenant de broadcast de mensagens, onde
cada cliente (conta) enxerga e gerencia exclusivamente os próprios dados.

## Modelo de dados

Todas as entidades são documents de **primeiro nível** em collections de primeiro
nível. Não existem subcollections.

| Collection    | Documento   | Chave                                |
| ------------- | ----------- | ------------------------------------ |
| `connections` | `Connection`| Documento gerado pelo Firestore        |
| `contacts`    | `Contact`   | Documento gerado pelo Firestore        |
| `messages`    | `Message`   | Documento gerado pelo Firestore        |

Tipos em `web/src/types/`.

```ts
Connection {
  id: string
  ownerId: string
  name: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

Contact {
  id: string
  ownerId: string
  connectionId: string
  name: string
  phone: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

Message {
  id: string
  ownerId: string
  connectionId: string
  contactIds: string[]
  content: string
  status: 'scheduled' | 'sent'
  scheduledAt: Timestamp | null
  sentAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

O `id` não é um campo gravado: é a chave do documento, devolvida pelo snapshot na
leitura. Quem escreve envia `ownerId`, `createdAt` e `updatedAt`; o `createdAt`/
`updatedAt` usam `serverTimestamp()`, ou seja, o relógio do servidor.

Não existe collection de perfil: o `displayName` informado no cadastro fica no
Firebase Authentication (via `updateProfile`) e o `ownerId` já é o `uid` do
Authentication, que é a identidade da sessão. Por isso `COLLECTIONS` tem exatamente
três entradas e nenhuma delas é `users` — o `catch-all` das Security Rules nega
qualquer outra collection ao cliente.

## `ownerId` e isolamento por cliente

`ownerId` é o **uid do Firebase Authentication** do dono dos dados. Ele existe em
`connections`, `contacts` e `messages` e é a chave de todo o isolamento.

O `ownerId` **nunca** é lido da UI. A função `getCurrentUserId` em
`web/src/services/firestore.ts` é a única origem de `ownerId` no cliente: ela lê
`auth.currentUser.uid` e falha se não houver usuário autenticado. Todo service
chama essa função internamente e **nenhum método de escrita recebe `ownerId` como
argumento** — a UI informaria o tenant, e a UI não é confiável.

O isolamento completo tem duas camadas:

1. **Cliente (frontend).** Queries e escritas sempre filtram por `ownerId`.
2. **Firestore Security Rules.** Reforçam a mesma regra no servidor, independentemente
   do que o cliente envie.

Como `ownerId` é o uid, não há uma tabela de "tenant": a identidade do tenant é a
própria identidade autenticada.

## Multi-tenancy and Firestore Security

O isolamento multi-tenant do Broadcast é sustentado por quatro decisões, e não por
uma delas sozinha:

- **O uid do Firebase Authentication representa o tenant.** Não existe entidade
  `tenant`, nem `tenantId`: o cliente é o usuário autenticado.
- **Todo documento de negócio tem `ownerId`.** `connections`, `contacts` e
  `messages` carregam o uid do dono. É o único campo que as Security Rules
  inspecionam para decidir acesso.
- **Toda query filtra por `ownerId`.** As queries dos services já nascem com
  `where('ownerId', '==', getCurrentUserId())` e não são exportadas: nenhuma tela
  consegue montar uma consulta sem o filtro de tenant.
- **As Security Rules reforçam o isolamento no servidor**, com `request.auth.uid`
  como única fonte de verdade.

O frontend **não** é considerado uma camada confiável. Mesmo que um bug, uma
dependência comprometida ou um `curl` direto tentasse gravar `ownerId: "outro-usuario"`
— ou apagar um documento de outro cliente —, a escrita é negada pelo Firestore.
O app apenas torna o caminho correto fácil; a garantia vem das regras.

Não existem subcollections por tenant (ver [Por que não usar subcollections](#por-que-não-usar-subcollections)):
os relacionamentos entre entidades são feitos por **id** — `contacts.connectionId`
aponta para `connections/{id}` e `messages.contactIds` guarda ids de `contacts`.
As regras verificam essa integridade: um contato ou uma mensagem só pode referenciar
uma conexão que exista e seja do próprio tenant.

### O que as regras deliberadamente não fazem

`firestore.rules` valida **autonomia e vínculo**, não regra de negócio. Ele garante
que ninguém mexe nos dados de outro tenant e que as referências entre entidades
pertencem ao mesmo dono. Ele **não** valida, por exemplo, se o texto da mensagem
está preenchido, se um contato tem telefone válido ou se `contactIds` aponta para
contatos existentes do tenant — verificar isso exigiria ler documentos dentro das
regras e transformaria o arquivo em um motor de validação. Essas regras ficam nos
**services** (`requiredText`, `createMessage`), que são a camada de domínio do
frontend.

O preço de não validar demais nas regras é nenhum: o Firestore é a única fronteira
de confiança, e ela responde pela segurança, não pela qualidade dos dados.

## Por que não usar subcollections

Uma modelagem alternativa seria `users/{uid}/connections/{id}` e afins. Ela foi
descartada por motivos práticos:

- **Cloud Functions.** O Admin SDK não tem "caminho do usuário corrente". Um
  scheduler precisa reconstruir o caminho completo a cada execução, enquanto
  `ownerId` vem junto no próprio documento.
- **Queries entre tenants.** Todas as collections ficam no mesmo nível, o que
  simplifica consultas administrativas e de suporte.
- **Custo de leitura.** `users/{uid}/...` tem o mesmo custo de leitura, mas com
  menos flexibilidade de agregação.
- **Segurança.** O isolamento passa a ser um campo comparável (`request.auth.uid ==
  resource.data.ownerId`) em vez de depender da estrutura do caminho, o que é mais
  fácil de auditar em regras.

O preço é que o isolamento **não** é garantido pela hierarquia do banco: ele é
garantido pelo campo `ownerId` e, obrigatoriamente, pelas Security Rules.

## Authentication e Firestore

```
onAuthStateChanged (AuthContext)
        │  user / loading
        ▼
    useAuth()  ──►  ownerId = user.uid
        │
        ▼
services/getCurrentUserId()  ──►  where('ownerId', '==', uid)  ──►  Firestore
        ▲
        │  onAuthStateChanged(auth) valida o token
        ▼
Cloud Functions / Security Rules (request.auth.uid)
```

- `web/src/lib/firebase.ts` é o **único** ponto de inicialização do SDK no
  frontend e exporta `app`, `auth` e `db`. Nenhum outro arquivo chama
  `initializeApp`.
- `AuthContext` expõe `user` e `loading` via `onAuthStateChanged`, mais `ownerId`
  derivado e as ações `signIn`, `signUp` e `logout`. É o **único** lugar do
  frontend que chama o Firebase Authentication.
- `useAuth()` expõe esse estado para a UI; `ProtectedRoute`/`GuestRoute`
  centralizam a decisão de renderizar a aplicação ou redirecionar para
  `/login`, de modo que nenhuma página verifica sessão por conta própria.
- O frontend nunca persiste senha, token ou estado de autenticação: nada é
  gravado em `localStorage` e não existe JWT próprio. O provedor **Email/Password**
  do Firebase Authentication é a única fonte de identidade, e o `displayName`
  informado no cadastro fica no Auth user via `updateProfile`.
- O Firestore autentica as requisições com o token emitido pelo Authentication, e
  é esse token que as Security Rules leem como `request.auth.uid`. Por isso `ownerId`
  e `request.auth.uid` são sempre o mesmo valor: não existe como divergir.
- No backend, `functions/src/lib/firebaseAdmin.ts` inicializa o Admin SDK, que
  ignora as Security Rules. As Cloud Functions de negócio vão validar a
  autorização por conta própria a partir do contexto da requisição.

## Processamento de Broadcasts Agendados (Cloud Functions)

As mensagens agendadas no sistema são processadas de forma automática e assíncrona no backend usando **Firebase Cloud Functions v2 (Scheduler)**. A regra de negócio vive em `functions/src/lib/broadcastScheduler.ts` e é disparada pela função `processScheduledBroadcasts`, implementada em `functions/src/scheduler.ts` e executada a cada minuto via Cloud Scheduler.

```
                    Cloud Scheduler (Cron / onSchedule)
                                   │
                                   ▼
                    processScheduledBroadcasts()
                                   │
              Consulta: status == "scheduled" && scheduledAt <= now
                                   │
                                   ▼
                       Transação Firestore (por documento)
               ┌───────────────────┴───────────────────┐
      status === "scheduled"                status !== "scheduled"
               │                                       │
               ▼                                       ▼
     status = "sent"                              (não altera)
     sentAt = Timestamp.now()
     updatedAt = Timestamp.now()
                                   │
                                   ▼
                       Firestore Realtime (onSnapshot)
                                   │
                                   ▼
                     UI reflete "Enviada" automaticamente
```

### Funcionamento e Idempotência

1. **Execução em Backend Autônoma:** A Cloud Function agendada (`processScheduledBroadcasts`) executa periodicamente via Cloud Scheduler (`onSchedule`). Não existe dependência do frontend estar aberto ou do usuário estar logado na interface.
2. **Consulta por Mensagens Vencidas:** A função busca mensagens com `status == "scheduled"` e `scheduledAt <= now` (comparando timestamps nativos do Firestore).
3. **Proteção contra Processamento Duplicado (Idempotência & Concorrência):** Cada mensagem é processada dentro de uma **transação Firestore**. A transação relê o documento e valida se `status === "scheduled"`. Se o status já tiver mudado para `"sent"` (por uma execução concorrente ou anterior), nenhuma alteração é feita.
4. **Preservação de Dados:** Na alteração para `"sent"`, os campos originais (`ownerId`, `connectionId`, `contactIds`, `content`, `scheduledAt`) permanecem intactos. Apenas `status`, `sentAt` e `updatedAt` são atualizados.
5. **Atualização em Tempo Real:** Assim que o documento é atualizado no Firestore pelo backend, o listener em tempo real (`onSnapshot`) do frontend recebe o evento e atualiza o estado da UI instantaneamente.

## Camada de acesso a dados

Funcional, em `web/src/services/`, organizada por domínio:

```
web/src/services/
├── firestore.ts     # COLLECTIONS, getCurrentUserId, requiredText, entityConverter
├── connections.ts   # CRUD + subscribe de conexões
├── contacts.ts      # CRUD + subscribe de contatos
└── messages.ts      # CRUD + subscribe de mensagens
```

Cada service é uma sequência de funções exportadas que recebem apenas o input do
usuário, montam o payload com `ownerId` e `serverTimestamp()` e devolvem a entidade
tipada. Não existe classe, repository genérico ou abstração sobre o Firestore: a
collection é a única estrutura compartilhada, e ela mora no service do domínio.

| Service   | Operações                                                                     |
| --------- | ----------------------------------------------------------------------------- |
| `connections` | `getConnections`, `createConnection`, `updateConnection`, `deleteConnection`, `subscribeToConnections` |
| `contacts`    | `getContacts(connectionId?)`, `createContact`, `updateContact`, `deleteContact`, `subscribeToContacts` |
| `messages`    | `getMessages(filters?)`, `createMessage`, `updateMessage`, `deleteMessage`, `subscribeToMessages` |

- Nenhum método recebe `ownerId`: ele é sempre derivado de `getCurrentUserId()`,
  que lança erro claro quando não há sessão.
- `entityConverter` fixa o formato do documento (o `id` não é gravado) e o
  `StoredDocument<T>` é o tipo do payload de escrita, checado pelo compilador.
- `updateMessage`/`updateContact` não alteram `connectionId`: a conexão é a âncora
  do registro, e trocá-la é regra de negócio.
- `createMessage` grava `status: 'sent'` quando não há `scheduledAt` (envio
  imediato) e `status: 'scheduled'` quando há. A transição posterior para `sent`,
  com o preenchimento de `sentAt`, é do backend (Admin SDK) no scheduler.
- `deleteConnection` é em cascata: contatos e mensagens vinculados à conexão são
  apagados em batches de 500 escritas antes do documento da conexão.

### Queries e isolamento nas leituras

As queries são filtradas por `ownerId` e ordenadas por `createdAt` (mais recentes
primeiro). `messagesQuery` ainda aceita `status` e `orderBy: 'scheduledAt'`,
usados pelo dashboard e pelo futuro scheduler:

```
ownerId == uid                                      → todas
ownerId == uid && status == 'sent'                 → enviadas
ownerId == uid && status == 'scheduled'            → agendadas
ownerId == uid && connectionId == id               → por conexão
ownerId == uid && status == 'scheduled'
         orderBy(scheduledAt, asc)                 → agendadas em ordem cronológica
```

As queries **não** são exportadas: os listeners e as leituras públicas já aplicam
o filtro de tenant, então não existe caminho no frontend que permita listar dados
de outro cliente.

### Realtime

`subscribeToConnections`, `subscribeToContacts` e `subscribeToMessages` devolvem a
função `unsubscribe` do `onSnapshot` e recebem os dados prontos em um callback. Não
há listener global: quem assina é a camada React, dentro de um `useEffect` que
chama `unsubscribe` no cleanup, de modo que nada continua escutando depois do
unmount. Erros de permissão chegam no `onError` opcional.

O `onSnapshot` entrega também o **echo local** da própria escrita antes de o
servidor responder. É isso que faz a UI mudar na hora: criar, editar e excluir não
disparar nenhuma recarga — quem redesenha a lista é o snapshot seguinte. A única
consequência prática é que os campos gravados com `serverTimestamp()` chegam
`null` nessa janela, e por isso `utils/format-timestamp.ts` trata o campo
ausente em vez de formatar `Invalid Date`.

## Camada de UI

A divisão entre página, componente e service é estrita:

| Camada                | Responsabilidade                                                                 |
| --------------------- | -------------------------------------------------------------------------------- |
| `pages/HomePage.tsx`  | Estado da tela, assinatura do listener e orquestração das ações                  |
| `components/connections/` | Formulário, diálogos, loading, mensagens de erro e a lista em si              |
| `services/connections.ts` | Firestore, autenticação, queries e persistência                               |

Nenhum componente React importa `firebase/firestore` nem conhece `ownerId`: a UI
informa o **nome** da conexão e o service decide o que gravar e de quem. Isso
mantém a regra de que nenhum `ownerId` vem da interface também no caminho de
escrita, e não só na leitura.

A rota autenticada `/` é a página de conexões. Os três componentes existem por
responsabilidade distinta, não por granularidade: `ConnectionList` decide qual dos
quatro estados mostrar (carregando, vazio, erro, lista), `ConnectionDialog` é o
formulário de criação **e** edição, e `DeleteConnectionDialog` é a confirmação de
uma ação destrutiva.

Erros nunca são engolidos nem exibidos como texto do SDK. `utils/data-errors.ts`
traduz o `code` do Firestore para uma mensagem de usuário, com o mesmo critério de
`utils/auth-errors.ts`: o erro aparece, traduzido, no ponto em que a ação falhou —
`Alert` dentro do diálogo para o formulário, `Alert` com "Tentar novamente" para a
leitura. A re-tentativa reabre a assinatura (`setSubscription`), em vez de refazer
`getConnections`, para não introduzir um segundo caminho de leitura.

`deleteConnection` apaga a conexão em cascata: contatos e mensagens vinculados
saem junto, em batches, e o diálogo de confirmação avisa isso ao usuário.

### Responsividade

A lista é uma tabela com `tableLayout: fixed`, com largura fixa para as colunas de
data e ações e a coluna de nome absorvendo o resto. Abaixo de `sm` a coluna
"Criada em" sai da tabela e a data passa a acompanhar o nome — uma única estrutura
de DOM, sem markup duplicado. Verificado sem overflow horizontal de 1280px a 360px.

### Índices

`firestore.indexes.json` declara os índices compostos de que as consultas do
aplicativo precisam. Toda query do frontend combina igualdade em `ownerId` com um
`orderBy`, o que exige índice composto — não há índice composto automático:

| Collection  | Índice                                                                | Consulta                                          |
| ----------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| `connections` | `ownerId` + `createdAt`                                             | lista de conexões, mais recentes primeiro         |
| `contacts`    | `ownerId` + `createdAt`                                             | contatos do tenant, mais recentes primeiro        |
| `contacts`    | `ownerId` + `connectionId` + `createdAt`                            | contatos de uma conexão                           |
| `messages`    | `ownerId` + `createdAt`                                             | aba "Todos"                                       |
| `messages`    | `ownerId` + `status` + `createdAt`                                  | aba "Enviadas"                                    |
| `messages`    | `ownerId` + `status` + `scheduledAt`                                | aba "Agendadas", em ordem cronológica             |
| `messages`    | `ownerId` + `connectionId` + `createdAt`                            | mensagens de uma conexão                          |
| `messages`    | `status` + `scheduledAt`                                            | varredura do scheduler (agendadas a vencer)        |

Consultas só de igualdade (`getConnection`, que soma `documentId()` ao filtro de
tenant) são atendidas pelos índices automáticos de campo único do Firestore e não
geram entrada aqui.

## Security Rules

`firestore.rules` implementa o isolamento com funções curtas:

| Regra                    | Garantia                                                                 |
| ------------------------ | ------------------------------------------------------------------------ |
| `isSignedIn()`           | usuário não autenticado não lê nem escreve nada                          |
| `isOwner(data)`          | só lê documento cujo `ownerId` é o próprio `request.auth.uid`             |
| `createsAsSelf()`        | só cria documento gravando o próprio `request.auth.uid`                  |
| `keepsOwnership()`       | no update, documento atual **e** novo precisam ter o mesmo dono          |
| `canReadDocument()`      | não apaga documento de outro tenant                                      |
| `ownsConnection(id)`     | `contacts` e `messages` só referenciam conexão existente do mesmo tenant  |

As regras são avaliadas **por documento** em leituras e consultas. Na prática isso
falha de forma fechada: uma consulta filtrando o `ownerId` de outro cliente — ou uma
consulta sem filtro nenhum — é negada com `permission-denied` em vez de devolver
uma lista vazia. É o comportamento verificado em `tests/firestore.rules.test.mjs`.

### Testes das regras e funções

```bash
npm run test:rules
npm run test:functions
npm run test
```

O script `test:rules` sobe o Firestore e o Auth emuladores (`--project demo-broadcast`) e roda
`tests/firestore.rules.test.mjs` com `@firebase/rules-unit-testing` sobre as regras
de `firestore.rules`.

O script `test:functions` roda `tests/scheduled.messages.test.mjs` testando o processamento
automático de mensagens agendadas e garantindo a idempotência com o Firestore Emulator.

Requer a CLI do Firebase (`firebase-tools`) e uma JVM no `PATH` — o emulador do
Firestore é um processo Java e não sobe sem ele.