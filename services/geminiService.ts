import { GoogleGenAI, Modality, Content, Part } from "@google/genai";

async function createImagenPrompt(
    prompt: string, 
    aspectRatio: string, 
    useDeepResearch: boolean,
    referenceImageBase64?: string | null, 
    personImageBase64?: string | null
): Promise<string> {
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = useDeepResearch ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    const config: { tools?: any[], thinkingConfig?: object } = {
        tools: [{googleSearch: {}}],
    };
    if (useDeepResearch) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    let instruction = `Your task is to act as a world-class prompt engineer for a high-end text-to-image AI model (Imagen 4). You must generate a single, highly-detailed, descriptive text prompt that will be used to create a stunning banner. Your prompt must be a masterpiece of descriptive language.

Analyze all the provided inputs (user's core idea, reference images, aspect ratio) and perform a Google Search to understand current visual trends related to the topic. Synthesize all this information into a single, cohesive prompt.

**AESTHETIC GOAL:** The final image should feel like it was professionally shot and edited by a human for a high-end campaign (e.g., for Behance). It MUST NOT have an "AI-generated" look. Prioritize natural textures, realistic lighting, and subtle, film-like color grading. Avoid overly perfect, plastic-looking surfaces or hyper-saturated colors.

**CRITICAL RULES:**
1.  **Output ONLY the final text prompt.** Do not include any other text, labels, or explanations.
2.  The prompt should be a single, dense paragraph.
3.  Describe the scene, subject, environment, lighting, colors, and composition with extreme detail.
4.  Incorporate cinematic and photographic terms like "shallow depth of field," "tack-sharp focus," "rule of thirds," "cinematic lighting," "8k," etc.
5.  Specify the exact aspect ratio required within the prompt itself (e.g., "a cinematic widescreen 16:9 aspect ratio").
---
`;

    const parts: Part[] = [];

    if (personImageBase64) {
        const [personMeta, personBase64Data] = personImageBase64.split(',');
        const personMimeType = personMeta.match(/:(.*?);/)?.[1] || 'image/jpeg';
        parts.push({ inlineData: { mimeType: personMimeType, data: personBase64Data } });
        instruction += `\n**TASK:** Integrate the person from the provided image into a new scene based on the user's prompt: "${prompt}". The person must be seamlessly blended. The final prompt you generate should describe this person within the new, highly detailed scene.`;
    }

    if (referenceImageBase64) {
        const [refMeta, refBase64Data] = referenceImageBase64.split(',');
        const refMimeType = refMeta.match(/:(.*?);/)?.[1] || 'image/jpeg';
        parts.push({ inlineData: { mimeType: refMimeType, data: refBase64Data } });
        instruction += `\n**INSPIRATION:** Analyze the provided reference image for its mood, color palette, and composition. DO NOT copy the image. Instead, use its successful elements as inspiration for the new scene. If there is a person in the reference image, create a completely new and unique person in your generated prompt.`;
    }

    if (!personImageBase64) {
        instruction += `\n**USER'S PROMPT:** "${prompt}"`;
    }
    
    instruction += `\n**ASPECT RATIO:** The final image MUST be ${aspectRatio}. Embed this requirement in your prompt.`;

    parts.unshift({ text: instruction });

    const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: parts }],
        config: config
    });
    
    return response.text;
}


export async function generateBanner(
    prompt: string, 
    aspectRatio: string, 
    useDeepResearch: boolean,
    referenceImageBase64?: string | null, 
    personImageBase64?: string | null
): Promise<string> {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        // Step 1: Use Gemini to create a master prompt for Imagen.
        const imagenPrompt = await createImagenPrompt(prompt, aspectRatio, useDeepResearch, referenceImageBase64, personImageBase64);
        
        // Step 2: Use Imagen to generate the high-quality image.
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imagenPrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: aspectRatio,
                outputMimeType: 'image/jpeg',
                quality: 92,
            },
        });

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;

    } catch (error) {
        console.error("Error generating banner:", error);
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('safety')) {
                throw new Error("The prompt was blocked for safety reasons. Please modify your prompt and try again.");
            }
            if (message.includes('api key not valid')) {
                 throw new Error("The server is incorrectly configured. API key is invalid.");
            }
            if (message.includes('429') || message.includes('resource has been exhausted')) {
                throw new Error("The service is currently overloaded. Please wait a moment and try again.");
            }
            if (message.includes('500') || message.includes('internal error')) {
                throw new Error("An unexpected server error occurred. Please try again later.");
            }
            throw new Error(`Failed to generate banner. Details: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating the banner.");
    }
}


export async function editBanner(imageBase64: string, editPrompt: string): Promise<string> {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const [meta, base64Data] = imageBase64.split(',');
    const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/png';
    
    const imagePart = {
        inlineData: {
            mimeType: mimeType,
            data: base64Data
        }
    };

    const textPart = {
        text: `You are an expert photo editor. Edit the provided image based on this instruction: "${editPrompt}". Only output the final edited image.`
    };
    
    const contents: Content = { parts: [imagePart, textPart] };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: contents,
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
        
        throw new Error("No image was generated from the edit. Please try a different prompt.");

    } catch (error) {
        console.error("Error editing banner:", error);
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('safety')) {
                throw new Error("The edit was blocked for safety reasons. Please modify your prompt and try again.");
            }
            if (message.includes('api key not valid')) {
                 throw new Error("The server is incorrectly configured. API key is invalid.");
            }
            if (message.includes('429') || message.includes('resource has been exhausted')) {
                throw new Error("The service is currently overloaded. Please wait a moment and try again.");
            }
            if (message.includes('500') || message.includes('internal error')) {
                throw new Error("An unexpected server error occurred. Please try again later.");
            }
            throw new Error(`Failed to edit banner. Details: ${error.message}`);
        }
        throw new Error("An unknown error occurred while editing the banner.");
    }
}