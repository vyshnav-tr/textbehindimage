import { NextRequest, NextResponse } from 'next/server';
import { removeBackground } from '@imgly/background-removal-node';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const originalBuffer = Buffer.from(arrayBuffer);

        // Get image metadata to check dimensions
        const originalImage = sharp(originalBuffer);
        const metadata = await originalImage.metadata();
        const originalWidth = metadata.width || 0;
        const originalHeight = metadata.height || 0;

        let processingBuffer = originalBuffer;
        let isResized = false;

        // Resize if image is too large (e.g., > 1500px width)
        // This significantly speeds up the background removal process
        if (originalWidth > 1500) {
            console.log(`Resizing image from ${originalWidth}px to 1500px for processing`);
            processingBuffer = await originalImage
                .resize(1500)
                .toBuffer();
            isResized = true;
        }

        const blob = new Blob([new Uint8Array(processingBuffer)], { type: file.type });

        console.log('Starting background removal...');
        const startTime = Date.now();

        // Perform background removal
        // We request PNG so we don't have to deal with raw buffer dimension matching issues
        const resultBlob = await removeBackground(blob, {
            output: {
                format: 'image/png',
                quality: 0.8
            }
        });
        const resultBuffer = Buffer.from(await resultBlob.arrayBuffer());

        console.log(`Background removal took ${(Date.now() - startTime) / 1000}s`);

        let finalBuffer: Buffer;

        if (isResized) {
            console.log('Upscaling mask to original resolution...');

            // 1. Load the processed (small) image
            // 2. Extract its alpha channel (the mask)
            // 3. Resize that mask to the original image dimensions
            const maskBuffer = await sharp(resultBuffer)
                .ensureAlpha()
                .extractChannel(3) // Extract alpha channel
                .resize(originalWidth, originalHeight, {
                    fit: 'fill' // Force exact match to original dimensions
                })
                .toBuffer();

            // 4. Apply the upscaled mask to the original high-res image
            finalBuffer = await sharp(originalBuffer)
                .ensureAlpha()
                .composite([{
                    input: maskBuffer,
                    blend: 'dest-in'
                }])
                .png()
                .toBuffer();
        } else {
            // If no resize was needed, the resultBuffer is already the full-res image with BG removed
            finalBuffer = resultBuffer;
        }

        return new NextResponse(new Blob([new Uint8Array(finalBuffer)], { type: 'image/png' }), {
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
