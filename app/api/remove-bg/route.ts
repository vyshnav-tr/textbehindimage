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
            console.log(`Upscaling mask to ${originalWidth}x${originalHeight}...`);

            // 1. Extract alpha channel (mask) from the processed low-res image
            // 2. Resize it to match original dimensions
            const maskBuffer = await sharp(resultBuffer)
                .ensureAlpha()
                .extractChannel(3)
                .resize(originalWidth, originalHeight, {
                    fit: 'fill'
                })
                .toBuffer();

            // 3. Apply the mask as the alpha channel of the original image
            // We strip any existing alpha from original, and append our new mask
            finalBuffer = await sharp(originalBuffer)
                .toColorspace('srgb') // Ensure consistent color space
                .removeAlpha()        // Remove existing alpha if any
                .joinChannel(maskBuffer) // Add our generated mask as the alpha channel
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
