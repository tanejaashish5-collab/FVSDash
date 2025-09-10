import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export async function POST(request: NextRequest) {
    try {
        const { timeROI, staffROI, contentROI, brandROI, analyticsROI } = await request.json();

        if (!timeROI || !staffROI || !contentROI || !brandROI || !analyticsROI) {
            return NextResponse.json({ message: 'Missing required ROI data points.' }, { status: 400 });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        const prompt = `
            You are an expert business consultant writing a concise, impactful ROI summary for a client's dashboard.
            The client is using "ForgeVoice Studio" (FVS), a content production service.
            Use the following data points to craft a compelling narrative storyline.
            The tone should be confident, professional, and value-driven.
            Keep the summary to a single, powerful paragraph.
            Start the summary with "Based on your current usage...".
            
            **Data Points:**
            - Time ROI (Annualized Value): $${timeROI.toLocaleString()}
            - Staff ROI (Annual Cost Avoidance): $${staffROI.toLocaleString()}
            - Content ROI (Annual Impressions): ${contentROI.toLocaleString()}
            - Brand ROI (Value from new clients/authority): $${brandROI.toLocaleString()}
            - Analytics ROI (Pipeline Value from content): $${analyticsROI.toLocaleString()}

            **Example Structure (adapt as needed):**
            "Based on your current usage, each episode saves you X hours, equating to $Y in your time annually. This system replaces over $Z in staff costs and grows your reach by over [Impressions] annually. The authority built has already driven an estimated $[Brand ROI Value] in new business, and your content is directly fueling a sales pipeline worth $[Analytics ROI]. The real question is—can you afford not to have FVS?"
            
            Your response must be a single string of plain text. Do not include JSON formatting, markdown, or any other characters. Just the paragraph.
        `;
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        
        // --- Robust Response Handling ---
        const blockReason = response.promptFeedback?.blockReason;
        if (blockReason) {
            console.error('Gemini response was blocked:', blockReason);
            return NextResponse.json({ message: `Request was blocked by the AI for safety reasons (${blockReason}). Please adjust the content.` }, { status: 400 });
        }

        const narrativeText = response.text;
        if (!narrativeText || narrativeText.trim() === '') {
            console.error('Gemini returned an empty response.');
            return NextResponse.json({ message: 'The AI model returned an empty response. This might be a temporary issue.' }, { status: 500 });
        }
        
        return NextResponse.json({ narrative: narrativeText });

    } catch (error: any) {
        console.error('[ROI Narrative API Error]', error);
        return NextResponse.json({ message: 'Failed to generate ROI narrative.', details: error.message }, { status: 500 });
    }
}