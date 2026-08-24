import { Logo } from "@/components/logo";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-6 py-12">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="text-3xl font-semibold">Política de privacidade</h1>
      <p className="text-sm text-muted-foreground">Última atualização: 24 de agosto de 2026</p>
      <p>
        Tratamos dados mínimos para operar a conta: e-mail, nome, avatar, mapas, publicações, mensagens e registros de uso da IA. A autenticação é feita pelo Supabase Auth (e-mail/senha, link mágico ou Google).
      </p>
      <h2 className="text-xl font-semibold">O que armazenamos</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>Perfil público (nome, usuário, bio, avatar)</li>
        <li>Mapas mentais e a visibilidade escolhida (privado, público, link)</li>
        <li>Arquivos enviados ao Storage, com limite de tipo e tamanho</li>
        <li>Curtidas, comentários, seguidores e mensagens diretas</li>
        <li>Contador mensal de gerações de IA</li>
      </ul>
      <h2 className="text-xl font-semibold">Acesso</h2>
      <p>
        Regras de Row Level Security restringem leitura e escrita. Administradores acessam denúncias e métricas agregadas. Não vendemos dados pessoais.
      </p>
      <h2 className="text-xl font-semibold">Retenção</h2>
      <p>
        Ao excluir a conta, o perfil e os dados associados são removidos em cascata, salvo obrigações legais de registro.
      </p>
    </article>
  );
}
