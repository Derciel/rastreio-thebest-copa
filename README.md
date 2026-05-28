# 📄 Sistema de Rastreamento & Consulta - The Best Açaí (Campanha de Inverno)

Este é um sistema web moderno, responsivo e de alta escala desenvolvido em **Next.js** e **Prisma ORM**, integrado a um banco de dados **PostgreSQL na nuvem (Neon.tech)** e sincronizado diretamente com uma planilha do **SharePoint** da Microsoft.

O objetivo do sistema é permitir que os franqueados da **The Best Açaí** realizem consultas instantâneas de suas Notas Fiscais referentes à **Campanha de Inverno: Potes da Copa e Embalagens Petit-gateau (Waffle)**, visualizando os itens exatos enviados em cada pedido e rastreando as cargas diretamente nos portais das transportadoras de forma automatizada ou assistida.

---

## 🚀 Tecnologias Utilizadas

*   **Frontend**: Next.js v16 (React + TypeScript) com Tailwind CSS (v4) e animações personalizadas.
*   **Backend (API)**: Next.js API Routes (Serverless-ready).
*   **Banco de Dados**: PostgreSQL na nuvem hospedado no **Neon.tech**.
*   **ORM**: Prisma ORM (v7.8.0) configurado com driver `pg` clássico e suporte a SSL seguro.
*   **Leitura de Excel**: Biblioteca `xlsx` (SheetJS) com parser dinâmico e flexível.

---

## 💎 Funcionalidades Principais

*   **Busca Sem Fricção**: Interface Dark Mode com efeito Glassmorphism, brilho roxo neon e máscara de formatação automática para CNPJ brasileiro.
*   **Detalhamento de Campanha**: Cada nota fiscal localizada detalha as quantidades exatas dos itens de inverno enviados: `Pote 240ml`, `Pote 500ml`, `Base Waffle` e `Tampas`.
*   **Cópia Rápida em 1-Clique**: Atalhos dedicados para copiar a Nota Fiscal e o CNPJ da **Nicopel Embalagens** (Remetente: `10815855000124`) instantaneamente.
*   **Integração de 10 Transportadoras & Motor SSW Inteligente**:
    *   **SSW Unificado**: Para as 6 transportadoras que utilizam a SSW (**Plav Transportadora**, **TEX**, **Envia Rápido**, **Biaghi & Luchini**, **Coopex** e **Alfa Transportes**), a aplicação gera um link de redirecionamento inteligente:
        `https://ssw.inf.br/cgi-local/tracking/10815855000124/[NF]`
        Ao clicar, o franqueado abre a página da SSW **com os dados de rastreamento (CNPJ do Remetente e Nota Fiscal) já preenchidos e a consulta carregada na tela**, sem digitar nada!
    *   **Canais Próprios**: Para as demais transportadoras (**Rodonaves**, **Expresso São Miguel**, **Carvalima** e **Sudoeste Transportes**), os botões apontam para os portais oficiais com instruções claras de cópia e colagem.
*   **Painel Administrativo (`/admin`)**: Rota privada que exibe o número total de notas fiscais indexadas no Neon PostgreSQL, a data da última importação e o botão para forçar a sincronização instantânea do SharePoint (protegido por `ADMIN_TOKEN`).

---

## 🛠️ Instalação e Execução Local

### Pré-requisitos
*   Node.js v18 ou superior instalado.
*   Um banco de dados PostgreSQL (como o provisionado no Neon.tech).

### Passos para rodar
1.  Clone o repositório em sua máquina:
    ```bash
    git clone <LINK_DO_SEU_REPOSITORIO>
    cd rastreio_thebest_copa
    ```
2.  Instale as dependências do npm:
    ```bash
    npm install
    ```
3.  Crie um arquivo `.env` na raiz do projeto (use o `.env.example` como base) e preencha as variáveis de ambiente com as credenciais corretas:
    *   `DATABASE_URL`: A URL do seu banco de dados PostgreSQL.
    *   `SHAREPOINT_URL`: O link público de compartilhamento da planilha Excel no SharePoint.
    *   `ADMIN_TOKEN`: Um segredo de sua preferência para proteger o importador.
4.  Gere o Prisma Client:
    ```bash
    npx prisma generate
    ```
5.  Inicialize o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
6.  Acesse a aplicação no navegador em:
    *   Público: `http://localhost:3000`
    *   Painel Administrativo: `http://localhost:3000/admin`

---

## ☁️ Instruções para Deploy na Nuvem (Vercel)

Este projeto foi construído seguindo os padrões de conformidade serverless do Next.js, tornando seu deploy na **Vercel** extremamente simples:

1.  Crie um novo projeto na Vercel e conecte o seu repositório do GitHub.
2.  Na seção **Environment Variables** da Vercel, adicione as três variáveis configuradas no seu `.env`:
    *   `DATABASE_URL`
    *   `SHAREPOINT_URL`
    *   `ADMIN_TOKEN`
3.  Defina a seguinte variável de ambiente na Vercel para garantir que a geração de build compile o Prisma nativo corretamente:
    *   `PRISMA_CLIENT_ENGINE_TYPE` = `library`
4.  Clique em **Deploy**. A Vercel fará a build automática e a aplicação estará no ar em menos de 2 minutos!

---

## ⚙️ Funcionamento do Parser do SharePoint

O backend da aplicação expõe a rota POST `/api/sync` (chamada via Painel Administrativo). Ao ser disparada:
1.  O sistema decodifica o link comum de visualização do SharePoint e gera uma URL segura de exportação binária do Office.
2.  O arquivo `.xlsx` é baixado temporariamente em memória.
3.  A planilha é parseada de forma **100% dinâmica**: as colunas obrigatórias e os itens de inverno são localizados através do texto dos cabeçalhos, tolerando qualquer mudança futura de ordem ou adição de colunas por parte de sua equipe.
4.  Os registros antigos são limpos e as novas notas fiscais são salvas em um lote único de transação de banco de dados no Neon PostgreSQL, assegurando consistência total e velocidade de gravação.
