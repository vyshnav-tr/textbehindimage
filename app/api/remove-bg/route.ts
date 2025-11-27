import { NextRequest, NextResponse } from 'next/server';
import { removeBackground } from '@imgly/background-removal-node';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: file.type });

        // Configure to download models if needed, though default behavior is usually fine.
        // We can pass config object if needed.
        const resultBlob = await removeBackground(blob);

        // const resultBuffer = Buffer.from(await resultBlob.arrayBuffer());

        return new NextResponse(resultBlob, {
            headers: {
                'Content-Type': 'image/png',
            },
        });
    } catch (error) {
        console.error('Error removing background:', error);
        return NextResponse.json(
            { error: 'Failed to remove background', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
