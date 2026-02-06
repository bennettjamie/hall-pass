// Vercel Serverless Function: Extract student names from class photo using Gemini Vision

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
        const { image } = req.body; // base64 image data
        
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }
        
        // Remove data URL prefix if present
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        
        // Call Gemini Vision API
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                text: `This is a MyEd BC school class photo grid. Extract ALL student names.

For each student, provide their name formatted as "FirstName L." (first name + last initial with period).

List them in reading order: left-to-right, top-to-bottom.

Mark any WITHDRAWN students by adding "[WITHDRAWN]" after their name.

Also determine the grid dimensions (how many rows and columns).

Respond in this exact JSON format:
{
  "grid": { "rows": number, "cols": number },
  "students": ["FirstName L.", "FirstName L.", ...]
}

Only respond with the JSON, no other text.`
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
                        temperature: 0.1,
                        maxOutputTokens: 2048,
                    }
                })
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', errorText);
            return res.status(500).json({ error: 'Vision API failed', details: errorText });
        }
        
        const data = await response.json();
        
        // Extract the text response
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textResponse) {
            return res.status(500).json({ error: 'No response from Vision API' });
        }
        
        // Parse the JSON response
        try {
            // Clean up response (remove markdown code blocks if present)
            const cleanJson = textResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const extracted = JSON.parse(cleanJson);
            
            return res.status(200).json({
                success: true,
                ...extracted
            });
        } catch (parseError) {
            // Return raw text if JSON parsing fails
            return res.status(200).json({
                success: true,
                raw: textResponse
            });
        }
        
    } catch (error) {
        console.error('Extract error:', error);
        return res.status(500).json({ error: error.message });
    }
}
