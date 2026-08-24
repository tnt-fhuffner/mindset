import { Logo } from "@/components/logo";
import Link from "next/link";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-6 py-12">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="text-3xl font-semibold">Termos de uso</h1>
      <p className="text-sm text-muted-foreground">Última atualização: 24 de agosto de 2026</p>
      <p>
        O MindSet é uma plataforma para criar mapas mentais e compartilhar materiais de estudo (PDFs, e-books, artigos, imagens e links). Ao criar uma conta, você concorda com estes termos.
      </p>
      <h2 className="text-xl font-semibold">Conta e conduta</h2>
      <p>
        Você é responsável pelo conteúdo que envia. Não publique material ilegal, malicioso, que viole direitos autorais ou que tente prejudicar outros usuários. A moderação pode bloquear contas e remover publicações denunciadas.
      </p>
      <h2 className="text-xl font-semibold">Conteúdo de terceiros</h2>
      <p>
        Arquivos e textos publicados por usuários não são endossados pelo MindSet. Antes de baixar um PDF ou e-book, verifique a origem. Não envie malware, executáveis ou arquivos disfarçados.
      </p>
      <h2 className="text-xl font-semibold">IA</h2>
      <p>
        O assistente de IA é um recurso limitado por usuário/mês. As sugestões podem conter erros. Não envie dados sensíveis no prompt.
      </p>
      <h2 className="text-xl font-semibold">Encerramento</h2>
      <p>
        Você pode apagar mapas e publicações a qualquer momento. Contas abusivas podem ser removidas pela administração.
      </p>
    </article>
  );
}
