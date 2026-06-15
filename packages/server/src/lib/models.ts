import {anthropic} from '@ai-sdk/anthropic'
import {openai} from '@ai-sdk/openai'

import {
    findSupportedChatModel,
    type SupportedChatModel,
    type SupportedChatModelId,
    type SupportedProvider,
} from '@whalincode/shared';

import type {LanguageModel} from 'ai';

type AnthropicModelId = Extract<SupportedChatModel, {provider: 'anthropic'}>["id"];
type OpenAIcModelId = Extract<SupportedChatModel, {provider: 'openai'}>["id"];

export type ResolvedModel = {
    model: LanguageModel;
    provider: SupportedProvider;
    modelId: SupportedChatModelId;
};

function assertUnsupportedProvider(provider: never) : never {
    throw new Error(`Unsupported provider: ${provider}`);
};

function resolveAnthropicModel(modelId: AnthropicModelId): ResolvedModel {
//     console.log(
//   "API KEY:",
//   process.env.ANTHROPIC_API_KEY,
//   "LEN:",
//   process.env.ANTHROPIC_API_KEY?.length
// );
    return {
        model: anthropic(modelId),
        provider: 'anthropic',
        modelId,
    };
};

function resolveOpenAIModel(modelId: OpenAIcModelId): ResolvedModel {
    return {
        model: openai(modelId),
        provider: 'openai',
        modelId,
    };
};

function resolveSupportedChatModel(model: SupportedChatModel): ResolvedModel {
    const provider = model.provider;

    switch (provider) {
        case 'anthropic':
            return resolveAnthropicModel(model.id);
        case 'openai':
            return resolveOpenAIModel(model.id);
        default:
            return assertUnsupportedProvider(provider);    
    };
}

export function isSupportedChatModel(modelId: string): modelId is SupportedChatModelId {
    return findSupportedChatModel(modelId) != undefined;
};

export function resolveChatModel(modelId: string): ResolvedModel {
    const model =findSupportedChatModel(modelId);
    if(!model){
        throw new Error(`Unsupported chat model: ${modelId}`);
    };

    return resolveSupportedChatModel(model);
};

export const models = [openai, anthropic]