export type ModelPricing = {
    inputUsedPerMillionTokens: number;
    outputUsedPerMillionTokens: number;
};

// mas adelante puedo exetnder los proveedores, como Gemini, Mistral, etc. Especialmente interesante, explorar Chatterbox
export type SupportedProvider = 'anthropic' | 'openai';

type SupportedChatModelDefinition = {
    id: string;
    provider: SupportedProvider;
    pricing: ModelPricing;
};

export const SUPPORTED_CHAT_MODELS= [
    // los pricing estan sacados de sus doc oficial.  En teoría, deberia de haber un margen de ganancia ya que al usar lo que se conoce como prompt-cache (ver que tanto ya manejan lso proveedores, o impementarlo yo mismo), el costo por token finalmente debiese de ser un poco mas  barato que a los usuarios.
    //mas adelante seguramente sea necesario incluir cachedInput, por q muchos proveedoes ya distinguen entre cacheado y normal
    {
        id: 'claude-sonnet-4-6',
        provider: 'anthropic',
        pricing: {
            inputUsedPerMillionTokens: 3,
            outputUsedPerMillionTokens: 15,
        },
    },
    {
        id: 'claude-haiku-4-5',
        provider: 'anthropic',
        pricing: {
            inputUsedPerMillionTokens: 1,
            outputUsedPerMillionTokens: 5,
        },
    },
    {
        id: 'claude-opus-4-6',
        provider: 'anthropic',
        pricing: {
            inputUsedPerMillionTokens: 5,
            outputUsedPerMillionTokens: 25,
        },
    },
    {
        id: 'gpt-5.4',
        provider: 'openai',
        pricing: {
            inputUsedPerMillionTokens: 2.5,
            outputUsedPerMillionTokens: 15,
        },
    },
    {
        id: 'gpt-5.4-mini',
        provider: 'openai',
        pricing: {
            inputUsedPerMillionTokens: 0.75,
            outputUsedPerMillionTokens: 4.5,
        },
    },
    {
        id: 'gpt-5.4-nano',
        provider: 'openai',
        pricing: {
            inputUsedPerMillionTokens: 0.2,
            outputUsedPerMillionTokens: 1.25,
        },
    },
] as const satisfies readonly SupportedChatModelDefinition[]; //satisfies me permite simultanemente hacer una validacion estructural, y una inferencia literal. Eso me conserva los ID´s literales ('gpt-5.4-nano') y no solo su tipado. 

export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number];

// Por eso aca se usa la inferencia literal, y obtengo un listado de ID´s reales
export type SupportedChatModelId = SupportedChatModel['id'];

export function findSupportedChatModel(modelId: string) {
    return SUPPORTED_CHAT_MODELS.find((model) => model.id === modelId);
};

export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId = 'claude-opus-4-6'; 