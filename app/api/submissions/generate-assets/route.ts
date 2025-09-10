import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import { Submission } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const submission: Submission = await request.json();

        if (!submission || !submission.title) {
            return NextResponse.json({ message: 'Valid submission data with a title is required.' }, { status: 400 });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const prompt = `
            You are a creative content strategist. Based on the following podcast submission, generate a list of 5 repurposed content assets to create a full content ecosystem.
            The list must include:
            - Three (3) 'Shorts' (short-form videos).
            - One (1) 'Blog' post.
            - One (1) 'Quote Graphic' (for social media).

            For each asset, provide a compelling, concise title and a brief description for the production team. The titles should be engaging and optimized for their respective platforms.

            **Podcast Submission Details:**
            - Title: "${submission.title}"
            - Guest: "${submission.guestName || 'N/A'}"

            Your response must be a valid JSON array of objects that conforms to the provided schema. Do not include any other text, explanations, or markdown formatting.
        `;

        const responseSchema = {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                    type: Type.STRING,
                    description: "The type of the deliverable: 'Shorts', 'Blog', or 'Quote Graphic'."
                },
                title: {
                    type: Type.STRING,
                    description: "A compelling title for this content asset."
                },
                description: {
                    type: Type.STRING,
                    description: "A brief description or instruction for the production team."
                }
              },
              required: ["type", "title", "description"],
            },
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
        
        // Add a unique ID to each generated item
        const results = JSON.parse(jsonStr).map((item: any) => ({ ...item, id: `sugg-${Date.now()}-${Math.random()}` }));

        return NextResponse.json(results);

    } catch (error: any) {
        console.error('[Generate Assets API Error]', error);
        return NextResponse.json({ message: 'Failed to generate asset suggestions.', details: error.message }, { status: 500 });
    }
}