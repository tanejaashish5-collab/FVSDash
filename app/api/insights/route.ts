import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from "@google/genai";

export async function POST(request: Request) {
    const { performanceData, summaryKPIs, timeRange } = await request.json();

    if (!performanceData || !summaryKPIs || !timeRange) {
        return NextResponse.json({ message: 'Missing required performance data for generating insights.' }, { status: 400 });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const sortedByViews = [...performanceData].sort((a: any, b: any) => b.views - a.views);

        const dataSummary = `
            Here is a summary of content performance for the last ${timeRange} days:
            - Total Views: ${summaryKPIs.totalViews.toLocaleString()}
            - Total Watch Time (hours): ${summaryKPIs.totalWatchTime.toLocaleString()}
            - New Subscribers Gained: ${summaryKPIs.totalSubscribersGained.toLocaleString()}
            - Average Engagement Rate: ${summaryKPIs.avgEngagementRate.toFixed(1)}%
            - Top performing content by views: "${sortedByViews[0]?.title}" with ${sortedByViews[0]?.views.toLocaleString()} views.
            - Total content published: ${summaryKPIs.publishingVelocity} pieces.
        `;

        const prompt = `
            You are an expert content strategist. Analyze the following content performance data for a client dashboard. Provide 3 concise, actionable insights for the content creator.
            Focus on what's working, what's not, and potential opportunities. Frame the insights as helpful, positive advice.
            For each insight, suggest an appropriate icon from this list: 'TrendUp', 'CheckCircle', 'Users', 'Lightbulb'.
            Your response must be a valid JSON array of objects that conforms to the provided schema. Do not include any other text, explanations, or markdown formatting.

            Data Summary:
            ${dataSummary}
        `;

        const responseSchema = {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                insight: {
                  type: Type.STRING,
                  description: "The actionable insight text, under 140 characters.",
                },
                icon: {
                  type: Type.STRING,
                  description: "The most relevant icon type from: 'TrendUp', 'CheckCircle', 'Users', 'Lightbulb'.",
                },
              },
              required: ["insight", "icon"],
            },
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

        const jsonResponse = JSON.parse(jsonStr);

        return NextResponse.json(jsonResponse);

    } catch (error: any) {
        console.error("Error generating insights:", error);
        return NextResponse.json({ message: 'Failed to generate AI insights.', details: error.message }, { status: 500 });
    }
}