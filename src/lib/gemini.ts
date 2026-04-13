import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface StoryBrief {
  title: string;
  summary: string;
  heroSpecs: {
    name: string;
    age: number;
    interests: string[];
  };
  setting: string;
  plotArc: {
    beginning: string;
    middle: string;
    end: string;
  };
  artStyle: string;
}

export interface StoryPage {
  pageNumber: number;
  text: string;
  visualPlan: {
    characterPositions: string;
    expressions: string;
    mood: string;
  };
  imageUrl?: string;
}

export const generateStoryBrief = async (prompt: string): Promise<StoryBrief> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a children's story brief based on: ${prompt}. 
    Follow this structure: Title, Summary, Hero (name, age, interests), Setting, Plot Arc (Beginning, Middle, End), Art Style.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          heroSpecs: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              age: { type: Type.NUMBER },
              interests: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["name", "age", "interests"],
          },
          setting: { type: Type.STRING },
          plotArc: {
            type: Type.OBJECT,
            properties: {
              beginning: { type: Type.STRING },
              middle: { type: Type.STRING },
              end: { type: Type.STRING },
            },
            required: ["beginning", "middle", "end"],
          },
          artStyle: { type: Type.STRING },
        },
        required: ["title", "summary", "heroSpecs", "setting", "plotArc", "artStyle"],
      },
    },
  });

  return JSON.parse(response.text || '{}');
};

export const generateStoryPages = async (brief: StoryBrief): Promise<StoryPage[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Expand this story brief into 5 discrete pages for a children's book. 
    Brief: ${JSON.stringify(brief)}.
    Each page should have 2-6 sentences. Tone: warm, hopeful, fun. Include gentle lessons.
    Also provide a visual plan for each page.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            pageNumber: { type: Type.NUMBER },
            text: { type: Type.STRING },
            visualPlan: {
              type: Type.OBJECT,
              properties: {
                characterPositions: { type: Type.STRING },
                expressions: { type: Type.STRING },
                mood: { type: Type.STRING },
              },
              required: ["characterPositions", "expressions", "mood"],
            },
          },
          required: ["pageNumber", "text", "visualPlan"],
        },
      },
    },
  });

  return JSON.parse(response.text || '[]');
};

export const generatePageImage = async (page: StoryPage, brief: StoryBrief): Promise<string> => {
  const prompt = `Art Style: ${brief.artStyle}. 
  Scene: ${page.visualPlan.characterPositions}, ${page.visualPlan.expressions}, ${page.visualPlan.mood}. 
  Hero: ${brief.heroSpecs.name}, ${brief.heroSpecs.age} years old, loves ${brief.heroSpecs.interests.join(', ')}. 
  Context: ${page.text}. 
  Ensure character consistency.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: "4:3",
      },
    },
  });

  let imageUrl = '';
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }
  return imageUrl;
};

// Dream Journal Logic
export interface DreamAnalysis {
  symbols: string[];
  archetypes: string[];
  emotionalThemes: string[];
  interpretation: string;
  surrealistPrompt: string;
}

export const analyzeDream = async (dreamText: string): Promise<DreamAnalysis> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this dream using Jungian Archetypes: ${dreamText}. 
    Identify symbols, archetypes (Shadow, Anima, etc.), emotional themes, and provide a deep psychological interpretation. 
    Also generate a prompt for a surrealist image representing the dream's core emotional frequency.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          symbols: { type: Type.ARRAY, items: { type: Type.STRING } },
          archetypes: { type: Type.ARRAY, items: { type: Type.STRING } },
          emotionalThemes: { type: Type.ARRAY, items: { type: Type.STRING } },
          interpretation: { type: Type.STRING },
          surrealistPrompt: { type: Type.STRING },
        },
        required: ["symbols", "archetypes", "emotionalThemes", "interpretation", "surrealistPrompt"],
      },
    },
  });

  return JSON.parse(response.text || '{}');
};

export const generateDreamImage = async (prompt: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: { parts: [{ text: `Surrealist art representing: ${prompt}` }] },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  let imageUrl = '';
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }
  return imageUrl;
};

// Expanded Synthesis Logic
export interface PodcastScript {
  title: string;
  hosts: { name: string; role: string }[];
  dialogue: { speaker: string; text: string }[];
}

export interface DebateScript {
  topic: string;
  pro: { name: string; argument: string }[];
  con: { name: string; argument: string }[];
  conclusion: string;
}

export interface RoundTableScript {
  topic: string;
  participants: { name: string; pov: string }[];
  discussion: { speaker: string; text: string }[];
}

export interface SlideContent {
  title: string;
  slides: { title: string; content: string[]; visualSuggestion: string }[];
}

export interface DeepResearchReport {
  title: string;
  sections: { title: string; content: string; references: string[] }[];
}

export const generatePodcast = async (dreamAnalysis: DreamAnalysis, hostCount: number, includeUser: boolean): Promise<PodcastScript> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a podcast script discussing this dream analysis: ${JSON.stringify(dreamAnalysis)}.
    Host Count: ${hostCount}. 
    Include User as a participant: ${includeUser}.
    The podcast should be engaging, insightful, and explore the psychological depths of the dream.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          hosts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
              },
              required: ["name", "role"],
            },
          },
          dialogue: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                speaker: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ["speaker", "text"],
            },
          },
        },
        required: ["title", "hosts", "dialogue"],
      },
    },
  });
  return JSON.parse(response.text || '{}');
};

export const generateDebate = async (dreamAnalysis: DreamAnalysis): Promise<DebateScript> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a debate script between two psychological perspectives (e.g., Jungian vs. Freudian) regarding this dream analysis: ${JSON.stringify(dreamAnalysis)}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          pro: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                argument: { type: Type.STRING },
              },
              required: ["name", "argument"],
            },
          },
          con: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                argument: { type: Type.STRING },
              },
              required: ["name", "argument"],
            },
          },
          conclusion: { type: Type.STRING },
        },
        required: ["topic", "pro", "con", "conclusion"],
      },
    },
  });
  return JSON.parse(response.text || '{}');
};

export const generateRoundTable = async (dreamAnalysis: DreamAnalysis): Promise<RoundTableScript> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a round table discussion script with 4 diverse personas (e.g., a mystic, a neuroscientist, a poet, and a historian) discussing this dream: ${JSON.stringify(dreamAnalysis)}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          participants: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                pov: { type: Type.STRING },
              },
              required: ["name", "pov"],
            },
          },
          discussion: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                speaker: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ["speaker", "text"],
            },
          },
        },
        required: ["topic", "participants", "discussion"],
      },
    },
  });
  return JSON.parse(response.text || '{}');
};

export const generateSlides = async (dreamAnalysis: DreamAnalysis): Promise<SlideContent> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate content for a 5-slide presentation summarizing this dream analysis: ${JSON.stringify(dreamAnalysis)}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.ARRAY, items: { type: Type.STRING } },
                visualSuggestion: { type: Type.STRING },
              },
              required: ["title", "content", "visualSuggestion"],
            },
          },
        },
        required: ["title", "slides"],
      },
    },
  });
  return JSON.parse(response.text || '{}');
};

export const generateDeepResearch = async (dreamAnalysis: DreamAnalysis): Promise<DeepResearchReport> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a deep research report on the symbols and themes in this dream: ${JSON.stringify(dreamAnalysis)}. 
    Include cross-cultural references, historical context, and psychological research.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                references: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["title", "content", "references"],
            },
          },
        },
        required: ["title", "sections"],
      },
    },
  });
  return JSON.parse(response.text || '{}');
};
