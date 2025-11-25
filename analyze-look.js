// No import needed! Node.js 18+ has native fetch support.

exports.handler = async function(event, context) {
    // 1. Security: Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    // 2. Security: Get API Key from Environment Variable
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("API Key is missing");
        return { statusCode: 500, body: JSON.stringify({ error: "Server Configuration Error" }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { imageBase64, styleVibe, faceShape } = body;

        // 3. Refined Prompt for Shorter, Cleaner Output
        // We explicitly tell Gemini to avoid Markdown and keep it brief.
        const systemInstruction = `
        Du är en expertbarberare på Kartago Barbershop.
        Ditt mål: Ge korta, kärnfulla råd.
        Regler:
        1. Inga rubriker, inga fetstiltecken (**), inga markdown-symboler (##).
        2. Max 2 korta stycken totalt.
        3. Fokusera direkt på "Vad" och "Varför". Inget fluff.
        4. Tonläge: Professionell, maskulin, direkt.
        `;

        let userPrompt = "";
        
        if (imageBase64) {
             userPrompt = `Analysera denna bild. Kunden gillar stilen: "${styleVibe}". Ge 1-2 konkreta, korta frisyrförslag på Svenska.`;
        } else {
             userPrompt = `Ansiktsform: ${faceShape}. Stil: ${styleVibe}. Ge 1-2 konkreta, korta frisyrförslag på Svenska.`;
        }

        const promptParts = [
            { text: systemInstruction + "\n" + userPrompt }
        ];

        if (imageBase64) {
            promptParts.push({ 
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64 
                }
            });
        }

        // 4. Call Google
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: promptParts }] })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", errorText);
            throw new Error(`Gemini API responded with status ${response.status}`);
        }

        const data = await response.json();

        // 5. Return result
        return {
            statusCode: 200,
            body: JSON.stringify(data) // Fixed missing parenthesis here
        };

    } catch (error) {
        console.error("Function Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};