import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";

export async function POST(request: NextRequest) {
    try {
        const { filename } = await request.json();

        if (!filename || typeof filename !== 'string') {
            return NextResponse.json({ message: 'A valid filename string is required.' }, { status: 400 });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        const prompt = `
            Analyze the following podcast episode filename and extract the full episode title and the guest's name.
            - The title is usually prefixed with something like "EP 026 —". Include this prefix in the title.
            - The guest's name often follows the title, introduced by "with" or "on". It might be a person's name like "Dr. Jane Doe" or a company name.
            - If no guest name is explicitly mentioned, return an empty string for the guestName.

            Filename: "${filename}"

            Your response must be a valid JSON object that conforms to the provided schema. Do not include any other text, explanations, or markdown formatting.
        `;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: {
                    type: Type.STRING,
                    description: "The full title of the episode, including any prefixes like 'EP 026 —'."
                },
                guestName: {
                    type: Type.STRING,
                    description: "The name of the guest featured in the episode. Blank if not present."
                }
            },
            required: ["title", "guestName"]
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        let jsonStr = response.text.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }

        const result = JSON.parse(jsonStr);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analyze Filename API Error]', error);
        return NextResponse.json({ message: 'Failed to analyze filename with AI.', details: error.message }, { status: 500 });
    }
}