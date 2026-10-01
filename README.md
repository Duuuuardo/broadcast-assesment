# Broadcast

Monorepo de um SaaS de Broadcast. As etapas cobrem a **fundação do domínio**, a **autenticação completa com Firebase Authentication (email/senha)**, a **camada de persistência no Firestore com isolamento multi-tenant**, **Connections**, **Contacts**, **Broadcasts** e o **processamento automático de broadcasts agendados via Firebase Cloud Functions**.

Esta fase implementa o **processamento automático de mensagens agendadas**: a regra `processScheduledMessages`, executada pela Cloud Function agendada `processScheduledBroadcasts` (`onSchedule`), identifica mensagens vencidas (`scheduledAt <= now`) e realiza a transição atômica de `scheduled` para `sent` protegida por transações Firestore, refletindo em tempo real no frontend sem depender da janela do navegador estar aberta.

As decisões de modelagem e multi-tenancy estão em [`docs/architecture.md`](docs/architecture.md).

## Stack

| Camada    | Tecnologias                                                    |
| --------- | -------------------------------------------------------------- |
| Frontend  | React, TypeScript, Vite, React Router, Material UI, Tailwind CSS, Firebase JS SDK |
| Backend   | Firebase Cloud Functions (TypeScript v2), Firebase Admin SDK   |
| Infra     | Firebase Authentication, Firestore, Firebase Hosting, Cloud Functions |
| Qualidade | TypeScript `strict`, builds separados para `web` e `functions`  |

Decisões de base:

- **Paradigma funcional.** Nenhuma classe ou orientação a objetos no código da aplicação.
- **Multi-tenant por `ownerId`.** Todo documento de negócio tem `ownerId` (uid do Firebase
  Authentication) e ele nunca vem da UI — é derivado por `getCurrentUserId`, que lê a sessão.
- **Alias de importação** `@/` → `web/src` (configurado em `web/vite.config.ts` e
  `web/tsconfig.app.json`).
- **Roteamento** com `react-router-dom` (v7) em `web/src/App.tsx`. As rotas são `/login`,
  `/register`, `/connections`, `/contacts`, `/broadcasts` e `/broadcasts/new`.

## Estrutura

```
/
├── web/                     # Frontend (projeto Vite independente)
│   ├── src/
│   │   ├── components/      # Componentes de UI reutilizáveis
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── layouts/         # Layouts (cabeçalho, container, etc.)
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # Acesso ao Firestore por domínio (connections, contacts, messages)
│   │   ├── contexts/        # Contextos React (AuthContext)
│   │   ├── types/           # Tipos do domínio e declarações de ambiente
│   │   ├── theme/           # Tema do Material UI
│   │   ├── lib/             # Infraestrutura: firebase.ts (única init do SDK)
│   │   ├── utils/           # Funções utilitárias
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.example
│   └── vite.config.ts
├── functions/               # Backend (projeto TypeScript independente)
│   ├── src/
│   │   ├── index.ts         # Ponto de entrada das Cloud Functions
│   │   ├── scheduler.ts     # Cloud Function agendada (onSchedule v2)
│   │   └── lib/             # firebaseAdmin.ts e broadcastScheduler.ts (lógica pura de agendamento)
│   ├── package.json
│   └── tsconfig.json
├── tests/
│   ├── firestore.rules.test.mjs    # Testes das Security Rules no emulador
│   └── scheduled.messages.test.mjs # Testes do processamento agendado e idempotência
├── docs/
│   └── architecture.md      # Modelagem de dados, multi-tenancy e decisões
├── firestore.rules          # Isolamento por tenant no servidor
├── firestore.indexes.json   # Índices compostos usados pelas queries
├── firebase.json
├── .firebaserc
├── .gitignore
└── README.md
```

- **`/web`** — todo o frontend vive aqui. Nada de código de aplicação fora desse diretório.
- **`/functions`** — projeto Node/TypeScript próprio, com dependências independentes do `web`. Faz o
  build para `functions/lib` e é consumido pela CLI do Firebase.

## Desenvolvimento

Pré-requisitos: Node.js 22 e npm 10+ (o `functions` também declara `engines.node: "22"`).

```bash
# instala as dependências dos dois projetos
npm run setup

# inicia o frontend em http://localhost:5173
npm run dev
```

Comandos disponíveis na raiz:

| Comando                  | Descrição                                          |
| ------------------------ | -------------------------------------------------- |
| `npm run setup`          | Instala dependências de `web` e `functions`        |
| `npm run dev`            | Sobe o Vite em modo de desenvolvimento              |
| `npm run build`          | Build de `web` + build de `functions`               |
| `npm run build:web`      | Apenas build do frontend                           |
| `npm run build:functions`| Apenas compilação das Cloud Functions              |
| `npm run typecheck`      | Checagem de tipos nos dois projetos                |
| `npm run preview`        | Serve o build de produção do frontend localmente    |
| `npm run emulators`      | Sobe os emuladores do Firebase (UI habilitada)     |
| `npm run test:rules`     | Testa as Security Rules no Firestore emulador       |
| `npm run test:functions` | Testa a função de agendamento no Firestore emulador|
| `npm run test`           | Executa todas as suítes de testes                 |
| `npm run deploy`         | Build completo e `firebase deploy`                 |

`npm run test` sobe os emuladores e executa os testes de Security Rules e Cloud Functions. Exige a CLI do Firebase e uma JVM no `PATH`.

## Firebase

Serviços utilizados:

- **Authentication** — autenticação de usuários via email/senha.
- **Firestore** — persistência de dados com `connections`, `contacts` e `messages`.
- **Cloud Functions** — backend agendado (`processScheduledBroadcasts`) para atualização assíncrona das mensagens agendadas.
- **Hosting** — serve o build de `web/dist`.

O projeto Firebase ativo é `broadcast-teste` (definido em `.firebaserc`).

### Deploy

```bash
# build dos dois projetos + deploy
npm run deploy

# apenas o frontend
npm run build:web && firebase deploy --only hosting
```

### Ambiente publicado

| Item                                | Status                                                     |
| ----------------------------------- | ---------------------------------------------------------- |
| Hosting                             | Publicado em https://broadcast-teste.web.app               |
| Firestore + `firestore.rules`       | Publicado (Banco `(default)` criado)                       |
| `firestore.indexes.json`            | Publicado (8 índices compostos)                             |
| Authentication (email/senha)        | Habilitado                                                  |
| `processScheduledBroadcasts`        | Ativa — agendada via Cloud Scheduler                        |

> **Agendamento.** A transição `scheduled` → `sent` é feita pela regra
> `processScheduledMessages` (`functions/src/lib/broadcastScheduler.ts`), coberta por
> testes de idempotência e concorrência, e disparada pela Cloud Function
> `processScheduledBroadcasts` (`onSchedule`). O frontend **não** simula esse
> processamento.

Variáveis de ambiente do frontend (`web/.env`, ver `web/.env.example`):

| Variável                  | Uso                                                        |
| ------------------------- | ---------------------------------------------------------- |
| `VITE_FIREBASE_*`         | Configuração do projeto Firebase                           |
| `VITE_USE_EMULATORS`      | `true` aponta o SDK para os emuladores locais               |

Os arquivos `.env` e `.env.*` são ignorados pelo Git; apenas `.env.example` é versionado.
