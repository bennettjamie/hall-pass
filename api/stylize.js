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
        
        // Style prompts - designed to be FLATTERING (no feature exaggeration)
        // Focus on art style transformation, not changing proportions
        const stylePrompts = {
            'original': null, // No transformation
            'disney': 'Disney Pixar 3D animated character, big friendly eyes, warm smile, appealing proportions, soft lighting, movie quality render',
            'anime': 'beautiful anime portrait, large sparkling eyes, soft features, clean linework, vibrant colors, heroic and confident expression, studio quality',
            'ghibli': 'Studio Ghibli style portrait, soft watercolor textures, gentle expression, warm earth tones, magical atmosphere, Hayao Miyazaki inspired',
            'superhero': 'heroic comic book portrait, confident expression, dynamic lighting, bold colors, Marvel/DC style, empowering and strong',
            'videogame': 'video game character portrait, detailed digital art, RPG hero style, vibrant colors, confident pose, Overwatch or Final Fantasy inspired',
            'popart': 'Andy Warhol pop art style, bold flat colors, high contrast, artistic halftone dots, vibrant and eye-catching, celebrity portrait style',
            'watercolor': 'beautiful watercolor portrait painting, soft blended colors, artistic brush strokes, dreamy atmosphere, gallery quality fine art',
            'sketch': 'detailed pencil sketch portrait, artistic shading, fine linework, classical drawing style, elegant and sophisticated',
            'fantasy': 'fantasy portrait with magical elements, soft glowing light, ethereal beauty, enchanted atmosphere, fairy tale illustration style',
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
        // IMPORTANT: Prompt designed to be flattering, focus on positive features
        const describeResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                text: `Describe this student for an artist to create a flattering portrait. Focus on:
- Age group (teen/young adult)
- Hair: color and general style
- Skin tone (use artistic terms like warm, cool, fair, medium, deep)
- Eye color if visible
- General expression (friendly, confident, cheerful, etc.)
- Clothing style/colors if visible

Keep description positive and flattering. Do NOT mention body type or weight. Focus only on face and upper body features needed for a portrait. Be concise, 2-3 sentences max.`
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
                        maxOutputTokens: 300,
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
        // Prompt designed for flattering, appealing results
        const imagePrompt = `Beautiful flattering portrait of a young student: ${description}. 
Art style: ${styleDesc}. 
Composition: square format, head and shoulders, centered, looking at viewer with friendly confident expression. 
Lighting: soft flattering studio lighting. Background: simple, clean, complements the subject.
Important: attractive proportions, appealing features, positive representation.`;
        
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
