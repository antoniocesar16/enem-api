import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { QuestionDetailSchema } from '@/lib/zod/schemas/questions';

type GetQuestionDetailsPayload = {
    year: string | number;
    index: string | number;
    language?: string | null;
};

function isRemoteUrl(file: string) {
    return file.startsWith('http://') || file.startsWith('https://');
}

function resolveAssetUrl(basePath: string, file: string) {
    if (isRemoteUrl(file) || file.startsWith('/')) {
        return file;
    }

    return `${basePath}/${file}`;
}

function resolveMarkdownImages(basePath: string, markdown: string) {
    return markdown.replace(/!\[(.*?)\]\(([^)]+)\)/g, (match, alt, src) => {
        if (isRemoteUrl(src) || src.startsWith('/')) {
            return match;
        }

        return `![${alt}](${basePath}/${src})`;
    });
}

export async function getQuestionDetails(payload: GetQuestionDetailsPayload) {
    let folder = `${payload.index}`;

    let filePath = `${process.cwd()}/public/${payload.year}/questions/${folder}/details.json`;

    if (!existsSync(filePath)) {
        if (!payload.language) {
            return null;
        }

        folder = `${payload.index}-${payload.language}`;
        filePath = `${process.cwd()}/public/${payload.year}/questions/${folder}/details.json`;

        if (!existsSync(filePath)) {
            return null;
        }
    }

    const questionRaw = await readFile(filePath, 'utf-8');
    const question = JSON.parse(questionRaw);

    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(
        /\/$/,
        '',
    );
    const basePath = configuredSiteUrl
        ? `${configuredSiteUrl}/${payload.year}/questions/${folder}`
        : `/${payload.year}/questions/${folder}`;

    question.files = question.files.map((file: string) =>
        resolveAssetUrl(basePath, file),
    );

    question.alternatives?.forEach((alternative: any) => {
        if (alternative.file) {
            alternative.file = resolveAssetUrl(basePath, alternative.file);
        }
    });

    if (question.context) {
        question.context = resolveMarkdownImages(basePath, question.context);
    }

    if (question.testlet) {
        question.testlet.files = question.testlet.files.map((file: string) =>
            resolveAssetUrl(basePath, file),
        );

        if (question.testlet.context) {
            question.testlet.context = resolveMarkdownImages(
                basePath,
                question.testlet.context,
            );
        }
    }

    return QuestionDetailSchema.parse(question);
}
