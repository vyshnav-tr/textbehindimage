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
        // This significantly speeds up the background removal process (seconds vs minutes)
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

        // Perform background removal to get the MASK only (faster)
        const maskBlob = await removeBackground(blob, {
            output: {
                format: 'image/x-alpha8', // Request only the alpha channel
                quality: 0.8
            }
        });
        const maskBuffer = Buffer.from(await maskBlob.arrayBuffer());

        console.log(`Background removal (mask generation) took ${(Date.now() - startTime) / 1000}s`);

        let finalBuffer: Buffer;

        if (isResized) {
            console.log('Upscaling mask to original resolution...');

            // Upscale the low-res mask to match original dimensions
            const upscaledMask = await sharp(maskBuffer, {
                raw: {
                    width: 1500, // The width we resized to (approx, need to be exact if aspect ratio changed)
                    height: Math.round(1500 * (originalHeight / originalWidth)), // Calculate expected height
                    channels: 1
                }
            })
                .resize(originalWidth, originalHeight, {
                    fit: 'fill' // Force exact match
                })
                .toBuffer();

            // Apply the upscaled mask to the original high-res image
            finalBuffer = await sharp(originalBuffer)
                .ensureAlpha()
                .composite([{
                    input: upscaledMask,
                    blend: 'dest-in',
                    raw: {
                        width: originalWidth,
                        height: originalHeight,
                        channels: 1
                    }
                }])
                .png()
                .toBuffer();
        } else {
            // If no resize was needed, just apply the mask directly
            // Note: maskBuffer is raw alpha data here because of 'image/x-alpha8'
            // We need to be careful with sharp raw input
            finalBuffer = await sharp(originalBuffer)
                .ensureAlpha()
                .composite([{
                    input: maskBuffer,
                    blend: 'dest-in',
                    raw: {
                        width: originalWidth,
                        height: originalHeight,
                        channels: 1
                    }
                }])
                .png()
                .toBuffer();
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
