import { NextRequest } from 'next/server';
import { ipAddress, geolocation } from '@vercel/functions';
import { PrismaClient } from '@prisma/client';

export async function logger(request: NextRequest) {
    if (process.env.NODE_ENV === 'development') {
        return;
    }

    const prisma = new PrismaClient();

    try {
        const vercelGeo = geolocation(request);

        const { method, url, headers } = request;

        const ip =
            ipAddress(request) ||
            headers.get('x-forwarded-for') ||
            request.headers.get('cf-connecting-ip');
        const userAgent = headers.get('user-agent');
        const referer = headers.get('referer');

        const country = vercelGeo?.country;
        const region = vercelGeo?.region;
        const city = vercelGeo?.city;
        const latitude = vercelGeo?.latitude;
        const longitude = vercelGeo?.longitude;

        const timestamp = new Date().toISOString();

        const logEntry = {
            url,
            method,
            ip: ip || null,
            userAgent,
            referer,
            country: country ? decodeURIComponent(country) : null,
            region: region ? decodeURIComponent(region) : null,
            city: city ? decodeURIComponent(city) : null,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            timestamp,
        };

        await prisma.log.create({
            data: logEntry,
        });
    } catch (error) {
        console.error('Failed to save log', error);
    }
}
