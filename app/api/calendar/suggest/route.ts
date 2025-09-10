import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";
import { Episode, UnscheduledItem } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const { episodes, unscheduledItems, currentMonth, currentYear } = await request.json();

        if (!Array.isArray(episodes) || !Array.isArray(unscheduledItems) || unscheduledItems.length === 0) {
            return NextResponse.json({ message: 'Valid episodes and unscheduledItems arrays are required.' }, { status: 400 });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

        const prompt = `You are a content marketing strategist for a high-end content agency. Your client wants you to suggest an optimal publishing schedule for their content pipeline for the month of ${monthName} ${currentYear}.

**Context:**
- **Already Scheduled Content:** ${JSON.stringify(episodes.map((e: Episode) => ({ title: e.title, type: e.type, dueDate: e.dueDate })))}
- **Unscheduled Pipeline (Content to be scheduled):** ${JSON.stringify(unscheduledItems)}

**Your Task:**
Suggest optimal publication dates for **all** items in the "Unscheduled Pipeline".

**Strategic Rules:**
1.  **Even Distribution:** Spread content out to maintain consistent audience engagement. Avoid big gaps and cluttered days.
2.  **Content Hierarchy:** Prioritize spacing for major content. Podcasts are high-effort; give them breathing room (at least 3-4 days from another podcast). Blogs are medium-effort. Shorts are low-effort and can be more frequent.
3.  **Best Practices (Guidelines, not strict rules):**
    - Podcasts often perform well on Tuesdays or Wednesdays.
    - Blogs are great for Thursdays to capture the end-of-week professional audience.
    - Shorts are effective on Mondays, Wednesdays, and Fridays to drive engagement throughout the week.
4.  **Date Constraints:** Only suggest dates within ${monthName} ${currentYear}. Format dates as "YYYY-MM-DD".
5.  **Reasoning:** For each suggestion, provide a concise, user-facing reason (max 100 characters). Examples: "Balances the week with a mid-week blog post.", "Good spacing from your last major podcast.", "Kicks off the week with engaging short-form content."

Your entire response **must** be a valid JSON array of objects conforming to the provided schema. Do not include any introductory text, explanations, or markdown formatting like \`\`\`json.
`;

        const responseSchema = {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                itemId: {
                  type: Type.STRING,
                  description: "The unique ID of the unscheduled item.",
                },
                suggestedDate: {
                  type: Type.STRING,
                  description: "The suggested publication date in YYYY-MM-DD format.",
                },
                reasoning: {
                    type: Type.STRING,
                    description: "A brief, user-friendly explanation for why this date was chosen (e.g., 'Good spacing from your last podcast'). Max 100 characters."
                }
              },
              required: ["itemId", "suggestedDate", "reasoning"],
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
        // The API might still wrap the response in markdown, so we need to clean it.
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }
        
        const result = JSON.parse(jsonStr);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Suggest Cadence API Error]', error);
        return NextResponse.json({ message: 'Failed to generate content suggestions.', details: error.message }, { status: 500 });
    }
}