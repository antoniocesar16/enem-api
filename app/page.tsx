import { getStats } from '@/lib/api/stats';
import { Separator } from '@/components/ui/separator';
import { CtaButton } from '@/components/ui/cta-button';
import { Logo } from '@/components/logo';
import { QuestionQuiz } from '@/components/question-quiz';

export default async function Home() {
    const stats = await getStats();

    return (
        <main className="w-full bg-white text-neutral-950">
            <section className="relative flex min-h-screen w-full flex-col items-center justify-center bg-white p-6 text-neutral-950 bg-dot-black/[0.3]">
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
                <div className="relative z-20 max-w-2xl text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <Logo />
                        <h1 className="bg-gradient-to-b from-neutral-500 to-neutral-800 bg-clip-text pb-2 pt-2 text-4xl font-bold text-transparent sm:text-7xl">
                            API ENEM
                        </h1>
                        <p>
                            Dados de {stats.totalQuestions}+ questões do ENEM,
                            dos anos de {stats.minYear} a {stats.maxYear}.
                        </p>
                    </div>
                    <Separator className="my-4" />
                    <div className="flex flex-col items-center justify-center gap-6">
                        <p>
                            Este site e sua API associada não são afiliados,
                            endossados ou patrocinados pelo Instituto Nacional
                            de Estudos e Pesquisas Educacionais Anísio Teixeira
                            (INEP) ou pelo Ministério da Educação (MEC). Este é
                            um projeto, sem fins lucrativos, criado pela
                            comunidade open-source brasileira, para facilitar o
                            acesso às questões do ENEM.
                        </p>
                        <p>
                            Todos os dados apresentados foram obtidos de fontes
                            abertas e são de domínio público conforme o Art. 8º
                            da Lei de Direitos Autorais (Lei nº 9.610/1998), que
                            exclui de proteção &quot;os textos de tratados ou
                            convenções, leis, decretos, regulamentos, decisões
                            judiciais e outros atos oficiais&quot;.
                        </p>
                        <a href="https://docs.enem.dev">
                            <CtaButton className="flex items-center justify-center space-x-2 bg-white text-sm text-black">
                                Ler documentação
                            </CtaButton>
                        </a>
                    </div>
                </div>
            </section>

            <section className="min-h-screen w-full bg-white px-6 py-16 text-neutral-950">
                <div className="mx-auto w-full max-w-4xl">
                    <QuestionQuiz />
                </div>
            </section>
        </main>
    );
}
