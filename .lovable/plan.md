
## Mudanças solicitadas

### 1. Identidade visual
- Renomear **FrequênciaTAG → FrequentarAgora** em todas as telas (login, signup, app-shell, home, títulos).
- Atualizar token de cor primária para **#1A2B4C** em `src/styles.css` (convertido para oklch) — mantém o resto do design system.
- **Home (`/`)**: novo headline "Controle de presença automatizado.", arte de fundo decorativa com motivo de **kimono** (SVG inline estilizado, sem dependência externa).

### 2. Cadastro e autenticação
- **Remover signup público.** A página `/signup` passa a ser apenas **"Definir senha"** — usada por convite (link com token).
- **Admin cria usuários** em `/admin/usuarios` informando: nome completo, email, matrícula, turma, papel (aluno/professor) e (opcional) tag RFID. Para professor: campo extra `turma` ou `sala` de atuação.
- Backend: server function `createUserInvite` (service role) que:
  - Cria `auth.users` via `supabaseAdmin.auth.admin.createUser` (sem senha, email_confirm=true).
  - Insere `profiles` + `user_roles` + (se houver tag) vincula `tags.user_id`.
  - Gera link de recuperação (`generateLink` type=recovery) → admin recebe URL para enviar ao usuário; também dispara email padrão.
- Página `/set-password` (pública): captura sessão de recovery e chama `auth.updateUser({password})`.
- **"Esqueci a senha"** no `/login`: dialog que chama `resetPasswordForEmail` com `redirectTo=/set-password`.

### 3. Papéis e permissões
- Enum `app_role` já tem `aluno|professor|admin`. Adicionar tabela **`professor_assignments`** (`user_id`, `turma` text nullable, `room_id` uuid nullable).
- Função `is_professor_of(_user, _turma, _room)` security definer.
- Atualizar RLS:
  - `profiles`/`attendance_logs`/`justifications`: professor vê linhas dos alunos cuja `profiles.turma` ou `attendance_logs.room_id` corresponda à sua atribuição.
  - Admin mantém acesso total; aluno só próprio.

### 4. Justificativas com aprovação
- Aluno cria justificativa (já existe). Adicionar coluna `reviewed_at`.
- Admin tem nova página `/admin/justificativas` listando **pendentes** com botões Aprovar/Rejeitar (atualiza `status` e `reviewed_by`).
- Falta só é "anulada" quando `status='aprovado'` — refletir nos extratos (ignorar dias cobertos por justificativa aprovada).
- **Notificações**: badge no `app-shell` admin (sino com contagem `count(*) where status='pendente'`), atualizado via realtime.

### 5. Dashboard aluno
- Já mostra status atual; reforçar com cartão grande "Presente"/"Ausente" com cor/ícone destacado no topo.

### 6. Relatórios admin
- Nova página `/admin/relatorios` com filtros: **aluno** (autocomplete), **turma** (select), **sala** (select), **período** (data início/fim).
- Gera tabela consolidada (entradas/saídas, horas, dias) e botão **Exportar CSV/XLSX**.
- Substitui o item "Inventário" do menu.

### 7. Tags RFID
- **Cadastro ao vivo**: leitor RFID posta UID em `/api/public/rfid-scan` (rota pública com header `x-rfid-secret`). Insere em nova tabela **`tag_scans`** (uid, scanned_at).
- Em `/admin/tags` e no formulário do `/admin/usuarios`, um painel "Última leitura" mostra via realtime o UID mais recente — clicar **"Usar esta tag"** preenche o campo.
- Em `/admin/usuarios`, na linha de cada usuário, botão **"Atualizar tag"** que abre o mesmo painel e substitui o vínculo (`tags.user_id` antigo desativado).
- Sem leitor físico ainda? Admin pode digitar UID manualmente como fallback.

### 8. Remover Inventário
- Excluir `src/routes/admin/inventario.tsx`, remover do menu e dashboard admin. Tabela `inventory` permanece no banco (não destrutivo) mas sem UI.

---

## Migrações de banco
1. `CREATE TABLE professor_assignments(...)` + RLS.
2. `CREATE TABLE tag_scans(uid text, scanned_at timestamptz, consumed_by uuid null)` + RLS (admin/professor read; insert via service role).
3. Adicionar `reviewed_at` em `justifications`.
4. Função `is_professor_of`.
5. Atualizar policies de `profiles`, `attendance_logs`, `justifications` para incluir professor.
6. Habilitar realtime para `tag_scans` e `justifications`.

## Arquivos novos
- `src/routes/set-password.tsx`
- `src/routes/admin/justificativas.tsx`
- `src/routes/admin/relatorios.tsx`
- `src/lib/users.functions.ts` (createUserInvite, updateUserTag)
- `src/components/tag-scan-picker.tsx`
- `src/components/kimono-bg.tsx`

## Arquivos alterados
- `src/styles.css` (cor primária + nome)
- `src/routes/index.tsx`, `__root.tsx`, `login.tsx`, `signup.tsx` (vira set-password ou redireciona)
- `src/routes/admin/usuarios.tsx`, `admin/tags.tsx`, `admin/index.tsx`
- `src/routes/dashboard.tsx`, `extrato.tsx`, `justificativas.tsx`
- `src/components/app-shell.tsx` (rename, novo menu, badge notificação, remover inventário)
- `src/hooks/use-auth.tsx` (expor helpers de papel professor)

---

## Confirmações rápidas antes de codar
- **Convites**: o admin recebe o link de recuperação na tela após criar o usuário (copia/cola para o aluno) **e** o email padrão do Supabase também é enviado. OK?
- **Leitor RFID**: aceito que a integração física fique como endpoint HTTP simples protegido por secret (`RFID_INGEST_SECRET`). OK?
- **Professor**: cada professor está vinculado a **uma** turma ou **uma** sala (pode escolher um ou outro no cadastro). OK?

Se sim para os três, sigo direto com migrações + código.
