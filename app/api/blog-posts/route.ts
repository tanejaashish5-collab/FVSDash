
import { NextRequest, NextResponse } from 'next/server';
import { BlogPost } from '@/types';
import { mapRecordToBlogPost, mapBlogPostToFields } from '@/utils';
import { GoogleGenAI, Type } from "@google/genai";

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'apptzuMZiEFsfweDU';
const AIRTABLE_BLOG_TABLE_ID = process.env.AIRTABLE_BLOG_TABLE_ID || 'tblb4rePoqPFU5xTl';
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_BLOG_TABLE_ID}`;

async function getAirtableHeaders() {
    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    if (!AIRTABLE_PAT) {
        throw new Error('Server configuration error: Required Airtable PAT is missing.');
    }
    return {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json',
    };
}

export async function GET() {
    try {
        const authHeaders = await getAirtableHeaders();
        const sortParams = 'sort%5B0%5D%5Bfield%5D=Generated%20At&sort%5B0%5D%5Bdirection%5D=desc';
        // Cast fetch options to `any` to allow Next.js-specific `next` property for revalidation.
        const response = await fetch(`${AIRTABLE_API_URL}?${sortParams}`, { 
            headers: authHeaders,
            next: { revalidate: 60 } // Revalidate every 60 seconds
        } as any);

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;
            try { errorJson = JSON.parse(errorText); } catch (e) {}
            return NextResponse.json({ message: errorJson?.error?.message || 'Failed to fetch from Airtable.', details: errorText }, { status: response.status });
        }

        const data = await response.json();
        const posts: BlogPost[] = (data.records || [])
            .map(mapRecordToBlogPost)
            .filter((p): p is BlogPost => p !== null);

        return NextResponse.json(posts);
    } catch (error: any) {
        console.error('[Airtable GET Error]', error);
        return NextResponse.json({ message: 'An internal server error occurred.', details: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const authHeaders = await getAirtableHeaders();
        const postToUpdate = await request.json() as BlogPost;
        const { id, ...data } = postToUpdate;

        if (!id) {
            return NextResponse.json({ message: 'Record ID is required for an update.' }, { status: 400 });
        }

        const fieldsToUpdate = mapBlogPostToFields(data);
        const body = JSON.stringify({
            records: [{ id, fields: fieldsToUpdate }]
        });
        
        const response = await fetch(AIRTABLE_API_URL, { method: 'PATCH', headers: authHeaders, body });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;
            try { errorJson = JSON.parse(errorText); } catch (e) {}
            return NextResponse.json({ message: errorJson?.error?.message || 'Failed to update Airtable.', details: errorText }, { status: response.status });
        }
        
        const responseData = await response.json();
        const updatedPost = mapRecordToBlogPost(responseData.records?.[0]);
        return NextResponse.json(updatedPost);
    } catch (error: any) {
        console.error('[Airtable PATCH Error]', error);
        return NextResponse.json({ message: 'An internal server error occurred.', details: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'generate-seo') {
        try {
            const { title, content } = await request.json();
            if (!title || !content) {
                return NextResponse.json({ message: 'Title and content are required.' }, { status: 400 });
            }
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `
                Based on the following blog post title and content, generate an SEO-optimized title (under 60 characters) and a meta description (under 160 characters).
                Your response must be a valid JSON object that conforms to the provided schema. Do not include any other text, explanations, or markdown formatting.
                
                Title: "${title}"
                Content: "${content.substring(0, 1500)}..."
            `;

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    seoTitle: {
                        type: Type.STRING,
                        description: "A concise, SEO-friendly title for the blog post, under 60 characters.",
                    },
                    seoDescription: {
                        type: Type.STRING,
                        description: "An engaging meta description for SEO, under 160 characters.",
                    },
                },
                required: ["seoTitle", "seoDescription"],
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

            const result = JSON.parse(jsonStr);
            return NextResponse.json(result);
        } catch(error: any) {
             console.error('[Gemini SEO Gen Error]', error);
             return NextResponse.json({ message: 'Failed to generate SEO metadata.', details: error.message }, { status: 500 });
        }
    }
    
    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
}
