'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, Loader2, Send, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AlternativeLetter = 'A' | 'B' | 'C' | 'D' | 'E';
type CorrectAlternative = AlternativeLetter | 'Anulado';
type ExamLanguage = 'espanhol' | 'ingles';

type Alternative = {
    letter: AlternativeLetter;
    text: string | null;
    file: string | null;
    isCorrect: boolean;
};

type Testlet = {
    id: string;
    start: number;
    end: number;
    context: string | null;
    files: string[];
};

type Question = {
    title: string;
    index: number;
    year: number;
    discipline: string | null;
    language: string | null;
    context: string | null;
    files: string[];
    correctAlternative: CorrectAlternative;
    testlets: boolean;
    testlet: Testlet | null;
    alternativesIntroduction: string | null;
    alternatives: Alternative[];
};

type QuestionsResponse = {
    metadata: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
    questions: Question[];
};

type AnswerState = 'correct' | 'wrong' | null;

function getQuestionKey(question: Question) {
    return `${question.index}-${question.language ?? 'espanhol'}`;
}

function QuestionContent({ value }: { value: string | null }) {
    const parts = useMemo(() => {
        if (!value) return [];

        const markdownImage = /!\[[^\]]*\]\(([^)]+)\)/g;
        const tokens: Array<{ type: 'text' | 'image'; value: string }> = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = markdownImage.exec(value))) {
            if (match.index > lastIndex) {
                tokens.push({
                    type: 'text',
                    value: value.slice(lastIndex, match.index),
                });
            }

            tokens.push({ type: 'image', value: match[1] });
            lastIndex = markdownImage.lastIndex;
        }

        if (lastIndex < value.length) {
            tokens.push({ type: 'text', value: value.slice(lastIndex) });
        }

        return tokens;
    }, [value]);

    if (parts.length === 0) return null;

    return (
        <div className="space-y-4 text-left text-sm leading-7 text-neutral-800 sm:text-base">
            {parts.map((part, index) =>
                part.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={`${part.value}-${index}`}
                        src={part.value}
                        alt="Imagem da questão"
                        className="mx-auto max-h-[520px] w-auto max-w-full rounded border border-neutral-200 object-contain"
                    />
                ) : (
                    <p key={index} className="whitespace-pre-line">
                        {part.value.trim()}
                    </p>
                ),
            )}
        </div>
    );
}

export function QuestionQuiz() {
    const [year, setYear] = useState('2025');
    const [examLanguage, setExamLanguage] = useState<ExamLanguage>('espanhol');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedQuestionKey, setSelectedQuestionKey] = useState('');
    const [question, setQuestion] = useState<Question | null>(null);
    const [selectedAlternative, setSelectedAlternative] =
        useState<AlternativeLetter | null>(null);
    const [answerState, setAnswerState] = useState<AnswerState>(null);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTestlet, setShowTestlet] = useState(false);

    const isCanceledQuestion = question?.correctAlternative === 'Anulado';
    const canAnswer = Boolean(
        question && selectedAlternative && !answerState && !isCanceledQuestion,
    );

    useEffect(() => {
        const controller = new AbortController();
        const selectedYear = year.trim();

        async function loadQuestions() {
            if (selectedYear.length !== 4) {
                setQuestions([]);
                setQuestion(null);
                setSelectedQuestionKey('');
                setError(null);
                setShowTestlet(false);
                return;
            }

            setIsLoadingQuestions(true);
            setError(null);
            setQuestions([]);
            setQuestion(null);
            setSelectedQuestionKey('');
            setSelectedAlternative(null);
            setAnswerState(null);
            setShowTestlet(false);

            try {
                const limit = 50;
                let offset = 0;
                let hasMore = true;
                const nextQuestions: Question[] = [];

                while (hasMore) {
                    const languageQuery =
                        examLanguage === 'ingles'
                            ? '&language=ingles'
                            : '&language=espanhol';
                    const response = await fetch(
                        `/v1/exams/${selectedYear}/questions?limit=${limit}&offset=${offset}${languageQuery}`,
                        { signal: controller.signal },
                    );

                    if (!response.ok) {
                        throw new Error(
                            'Não foi possível carregar as questões dessa prova.',
                        );
                    }

                    const data = (await response.json()) as QuestionsResponse;
                    nextQuestions.push(...data.questions);
                    hasMore = data.metadata.hasMore;
                    offset += limit;
                }

                const uniqueQuestions = Array.from(
                    new Map(
                        nextQuestions.map(nextQuestion => [
                            getQuestionKey(nextQuestion),
                            nextQuestion,
                        ]),
                    ).values(),
                ).sort((first, second) => first.index - second.index);

                setQuestions(uniqueQuestions);
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') {
                    return;
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : 'Não foi possível carregar as questões dessa prova.',
                );
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingQuestions(false);
                }
            }
        }

        loadQuestions();

        return () => controller.abort();
    }, [year, examLanguage]);

    function handleQuestionSelect(questionKey: string) {
        setSelectedQuestionKey(questionKey);
        setSelectedAlternative(null);
        setAnswerState(null);
        setShowTestlet(false);

        const nextQuestion = questions.find(
            currentQuestion => getQuestionKey(currentQuestion) === questionKey,
        );

        setQuestion(nextQuestion ?? null);
    }

    function handleAnswer() {
        if (!question || !selectedAlternative || isCanceledQuestion) return;

        setAnswerState(
            selectedAlternative === question.correctAlternative
                ? 'correct'
                : 'wrong',
        );
    }

    return (
        <section className="relative z-20 w-full py-8 text-left text-neutral-950">
            <div className="mb-5 text-center">
                <h2 className="text-2xl font-semibold text-neutral-950">
                    Resolver questão
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                    Escolha o ano e a prova para carregar as questões direto da
                    API.
                </p>
            </div>

            <div className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-[150px_190px_1fr]">
                <label className="space-y-1 text-sm font-medium text-neutral-700">
                    Ano
                    <input
                        type="number"
                        min="2009"
                        max="2025"
                        value={year}
                        onChange={event => setYear(event.target.value)}
                        className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
                        required
                    />
                </label>

                <label className="space-y-1 text-sm font-medium text-neutral-700">
                    Prova
                    <select
                        value={examLanguage}
                        onChange={event =>
                            setExamLanguage(event.target.value as ExamLanguage)
                        }
                        className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
                    >
                        <option value="espanhol">Espanhol</option>
                        <option value="ingles">Inglês</option>
                    </select>
                </label>

                <label className="space-y-1 text-sm font-medium text-neutral-700">
                    Questão
                    <div className="relative">
                        <select
                            value={selectedQuestionKey}
                            onChange={event =>
                                handleQuestionSelect(event.target.value)
                            }
                            disabled={
                                isLoadingQuestions || questions.length === 0
                            }
                            className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <option value="">
                                {isLoadingQuestions
                                    ? 'Carregando questões...'
                                    : 'Selecione uma questão'}
                            </option>
                            {questions.map(currentQuestion => (
                                <option
                                    key={getQuestionKey(currentQuestion)}
                                    value={getQuestionKey(currentQuestion)}
                                >
                                    Questão {currentQuestion.index}
                                    {currentQuestion.language
                                        ? ` - ${currentQuestion.language}`
                                        : ''}
                                    {currentQuestion.correctAlternative ===
                                    'Anulado'
                                        ? ' - Anulada'
                                        : ''}
                                </option>
                            ))}
                        </select>
                        {isLoadingQuestions && (
                            <Loader2 className="pointer-events-none absolute right-8 top-3 h-4 w-4 animate-spin text-neutral-500" />
                        )}
                    </div>
                </label>
            </div>

            {error && (
                <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {!error && !isLoadingQuestions && questions.length > 0 && (
                <p className="mt-3 text-center text-xs text-neutral-500">
                    {questions.length} questões carregadas para {year} -{' '}
                    {examLanguage === 'ingles' ? 'Inglês' : 'Espanhol'}.
                </p>
            )}

            {question && (
                <article className="relative mt-5 rounded-lg border border-neutral-200 bg-white p-5 text-neutral-950 shadow-lg sm:p-7">
                    <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                        {isCanceledQuestion && (
                            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
                                Questão Anulada
                            </div>
                        )}
                    </div>

                    <header className="mb-5 flex flex-col gap-2 border-b border-neutral-200 pb-4 pr-0 sm:flex-row sm:items-start sm:justify-between sm:pr-36">
                        <div>
                            <h3 className="text-lg font-bold text-neutral-950">
                                {question.title}
                            </h3>
                            <p className="text-sm text-neutral-500">
                                Ano {question.year}
                                {question.discipline
                                    ? ` • ${question.discipline}`
                                    : ''}
                                {question.language
                                    ? ` • ${question.language}`
                                    : ' • espanhol'}
                            </p>
                        </div>
                        <span className="w-fit rounded border border-neutral-300 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                            Questão {question.index}
                        </span>
                    </header>

                    {question.testlets && question.testlet && (
                        <section className="mb-5 rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                                        Questão de TestLets
                                    </p>
                                    <p className="mt-1 text-sm text-neutral-700">
                                        Esta questão usa o texto-base das
                                        questões {question.testlet.start} a{' '}
                                        {question.testlet.end}.
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        setShowTestlet(current => !current)
                                    }
                                    className="w-full gap-2 border-neutral-300 bg-white dark:bg-white dark:text-black dark:border-neutral-300 text-black hover:bg-white hover:text-black sm:w-auto"
                                >
                                    <Eye className="h-4 w-4" />
                                    {showTestlet
                                        ? 'Ocultar testlet'
                                        : 'Ver testlet'}
                                </Button>
                            </div>

                            {showTestlet && (
                                <section className="mt-4 rounded-md border border-neutral-200 bg-white p-4">
                                    <div className="mb-3 flex flex-col gap-1 border-b border-neutral-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                                        <h4 className="text-sm font-bold uppercase tracking-wide text-neutral-700">
                                            Texto-base
                                        </h4>
                                        <span className="text-xs font-semibold text-neutral-500">
                                            Questões {question.testlet.start} a{' '}
                                            {question.testlet.end}
                                        </span>
                                    </div>
                                    <QuestionContent
                                        value={question.testlet.context}
                                    />
                                </section>
                            )}
                        </section>
                    )}

                    <QuestionContent value={question.context} />

                    {question.alternativesIntroduction && (
                        <p className="mt-5 text-sm font-semibold leading-7 text-neutral-900 sm:text-base">
                            {question.alternativesIntroduction}
                        </p>
                    )}

                    <div className="mt-5 space-y-3">
                        {question.alternatives.map(alternative => {
                            const isSelected =
                                selectedAlternative === alternative.letter;
                            const isCorrect =
                                answerState &&
                                question.correctAlternative !== 'Anulado' &&
                                alternative.letter ===
                                    question.correctAlternative;
                            const isWrongSelection =
                                answerState === 'wrong' && isSelected;

                            return (
                                <button
                                    key={alternative.letter}
                                    type="button"
                                    onClick={() => {
                                        if (
                                            !answerState &&
                                            !isCanceledQuestion
                                        ) {
                                            setSelectedAlternative(
                                                alternative.letter,
                                            );
                                        }
                                    }}
                                    className={cn(
                                        'grid w-full grid-cols-[2.5rem_1fr] items-start gap-3 rounded-md border bg-white p-3 text-left transition',
                                        !isCanceledQuestion &&
                                            'hover:border-neutral-900 hover:bg-neutral-50',
                                        isSelected &&
                                            'border-neutral-950 bg-neutral-100',
                                        isCorrect &&
                                            'border-green-600 bg-green-50',
                                        isWrongSelection &&
                                            'border-red-600 bg-red-50',
                                        isCanceledQuestion &&
                                            'cursor-not-allowed opacity-75',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-sm font-bold text-neutral-700',
                                            isSelected &&
                                                'border-neutral-950 bg-neutral-950 text-white',
                                            isCorrect &&
                                                'border-green-600 bg-green-600 text-white',
                                            isWrongSelection &&
                                                'border-red-600 bg-red-600 text-white',
                                        )}
                                    >
                                        {alternative.letter}
                                    </span>
                                    <span className="space-y-3 text-sm leading-6 text-neutral-800 sm:text-base">
                                        {alternative.text && alternative.text}
                                        {alternative.file && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={alternative.file}
                                                alt={`Imagem da alternativa ${alternative.letter}`}
                                                className="max-h-64 max-w-full rounded border border-neutral-200 object-contain"
                                            />
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Button
                            type="button"
                            onClick={handleAnswer}
                            disabled={!canAnswer}
                            className="gap-2"
                        >
                            <Send className="h-4 w-4" />
                            Responder
                        </Button>

                        {isCanceledQuestion && (
                            <div className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800">
                                <XCircle className="h-4 w-4" />
                                Esta questão foi anulada.
                            </div>
                        )}

                        {answerState && (
                            <div
                                className={cn(
                                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold',
                                    answerState === 'correct'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800',
                                )}
                            >
                                {answerState === 'correct' ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                    <XCircle className="h-4 w-4" />
                                )}
                                {answerState === 'correct'
                                    ? 'Você acertou!'
                                    : `Você errou. Resposta correta: ${question.correctAlternative}`}
                            </div>
                        )}
                    </div>
                </article>
            )}
        </section>
    );
}
