// Vercel Serverless Function: Generate styled avatar from face photo

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { image, style, name } = req.body;
        
        if (!image || !style) {
            return res.status(400).json({ error: 'Image and style required' });
        }
        
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }
        
        // Remove data URL prefix if present
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        
        // Style prompts for different looks
        const stylePrompts = {
            'original': null, // No transformation
            'illustration': 'detailed pen and ink illustration style, like currency engraving, fine crosshatching',
            'disney': 'Disney/Pixar 3D animated movie character style, expressive eyes, friendly appearance',
            'anime': 'anime/manga style, large expressive eyes, clean lines, colorful',
            'ghibli': 'Studio Ghibli anime style, soft watercolor textures, warm and whimsical',
            'pixar': 'Pixar 3D animation style, smooth rendering, appealing character design',
            'caricature': 'exaggerated caricature style, emphasizing distinctive features, humorous',
            'watercolor': 'soft watercolor portrait style, artistic and painterly',
            'comic': 'comic book style, bold outlines, dynamic coloring',
            'minimalist': 'minimalist flat design, simple shapes, limited color palette',
        };
        
        if (style === 'original') {
            // Return original image unchanged
            return res.status(200).json({
                success: true,
                style: 'original',
                image: image
            });
        }
        
        const styleDesc = stylePrompts[style] || stylePrompts['illustration'];
        
        // Step 1: Describe the person using Gemini Vision
        const describeResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                text: `Describe this person's appearance for an artist to recreate. Include:
- Approximate age (child/teen/young adult)
- Hair color, style, length
- Skin tone
- Any distinctive features
- What they're wearing (if visible)
- Their expression

Be concise but specific. Just describe, no commentary.`
                            },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: base64Data
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 500,
                    }
                })
            }
        );
        
        if (!describeResponse.ok) {
            throw new Error('Failed to analyze image');
        }
        
        const descData = await describeResponse.json();
        const description = descData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!description) {
            throw new Error('Could not describe the person');
        }
        
        // Step 2: Generate styled portrait using Imagen
        const imagePrompt = `Portrait of a student: ${description}. 
Style: ${styleDesc}. 
Square format, centered face, school portrait composition, friendly expression, solid neutral background.`;
        
        const imagenResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{ prompt: imagePrompt }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: "1:1",
                        safetyFilterLevel: "block_few",
                        personGeneration: "allow_adult"
                    }
                })
            }
        );
        
        if (!imagenResponse.ok) {
            const errorText = await imagenResponse.text();
            console.error('Imagen error:', errorText);
            // Fall back to original image if generation fails
            return res.status(200).json({
                success: true,
                style: style,
                image: image,
                fallback: true,
                error: 'Style generation unavailable'
            });
        }
        
        const imagenData = await imagenResponse.json();
        const generatedImage = imagenData.predictions?.[0]?.bytesBase64Encoded;
        
        if (!generatedImage) {
            return res.status(200).json({
                success: true,
                style: style,
                image: image,
                fallback: true
            });
        }
        
        return res.status(200).json({
            success: true,
            style: style,
            image: `data:image/png;base64,${generatedImage}`,
            description: description
        });
        
    } catch (error) {
        console.error('Stylize error:', error);
        return res.status(500).json({ error: error.message });
    }
}
