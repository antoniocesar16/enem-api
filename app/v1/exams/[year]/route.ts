import { NextRequest, NextResponse } from 'next/server';
import { getExams } from '@/lib/api/exams/get-exams';
import { getExamDetails } from '@/lib/api/exams/get-exam-details';
import { EnemApiError, handleAndReturnErrorResponse } from '@/lib/api/errors';
import { RateLimiter } from '@/lib/api/rate-limit';
import { logger } from '@/lib/api/logger';

export const dynamic = 'force-dynamic';

const rateLimiter = new RateLimiter();

const getExamsYears = async () => {
    const exams = await getExams();
    return exams.map(exam => exam.year);
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ year: string }> },
) {
    try {
        const { year } = await params;

        const { rateLimitHeaders } = rateLimiter.check(request);

        await logger(request);

        const examYears = await getExamsYears();

        if (!examYears.includes(Number(year))) {
            throw new EnemApiError({
                code: 'not_found',
                message: `No exam found for year ${year}`,
            });
        }

        const exam = await getExamDetails(year);

        return NextResponse.json(exam, { headers: rateLimitHeaders });
    } catch (error) {
        return handleAndReturnErrorResponse(error);
    }
}
