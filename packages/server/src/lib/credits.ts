import {
    SUPPORTED_CHAT_MODELS,
    findSupportedChatModel,
    type ModelPricing,
} from '@whalincode/shared';
import type { LanguageModelUsage } from 'ai';

type CalculateCreditsForUsageParams = {
    provider: string;
    model: string;
    usage: LanguageModelUsage;
};

type BillableUsage = {
    credits: number;
};

type TokenCounts = {
    inputTokens: number;
    outputTokens: number;
};

const TOKENS_PER_MILLION = 1_000_000;
/**
 * Valor en dólares estadounidenses representado por un crédito interno.
 *
 * El sistema de facturación trabaja con créditos para desacoplar la experiencia
 * del usuario de los precios reales de los proveedores de IA. Actualmente,
 * 1 crédito = USD 0,01.
 *
 * Modificar esta constante cambia la granularidad del sistema de créditos sin
 * afectar el cálculo de costos basado en los precios de los modelos.
 */
const USD_PER_CREDIT = 0.01;

function getTokenCounts(usage: LanguageModelUsage): TokenCounts {
    const inputTokens = usage.inputTokens;
    const outputTokens = usage.outputTokens;

    if (inputTokens == null || outputTokens == null) {
        throw new Error('Credits conversion require input and output token counts');
    }

    return {
        inputTokens,
        outputTokens,
    };
}

function getModelPricing(provider: string, model: string): ModelPricing {
    const providerExists = SUPPORTED_CHAT_MODELS.some(
        (supportedModel) => supportedModel.provider === provider,
    );

    if (!providerExists) {
        throw new Error(`Unsupported billing provider: ${provider}`);
    }

    const supportedModel = findSupportedChatModel(model);

    if (!supportedModel) {
        throw new Error(`Unsupported billing model: ${model}`);
    }

    if (supportedModel.provider !== provider) {
        throw new Error(`Model "${model}" does not belong to provider "${provider}"`);
    }

    return supportedModel.pricing;
}

function estimateCostUsd(
    { inputTokens, outputTokens }: TokenCounts,
    pricing: ModelPricing,
): number {
    return (
        (inputTokens * pricing.inputUsedPerMillionTokens +
            outputTokens * pricing.outputUsedPerMillionTokens) /
        TOKENS_PER_MILLION
    );
}

function convertUsdToCredits(estimatedCostUsd: number): number {
    if (estimatedCostUsd <= 0) return 0;

    // Toda solicitud con un costo distinto de cero consume al menos 1 crédito.
    // El redondeo hacia arriba garantiza que las fracciones de crédito siempre
    // se facturen como un crédito completo.
    return Math.max(1, Math.ceil(estimatedCostUsd / USD_PER_CREDIT));
}

export function calculateCreditsForUsage({
    provider,
    model,
    usage,
}: CalculateCreditsForUsageParams): BillableUsage {
    const tokenCount = getTokenCounts(usage);
    const pricing = getModelPricing(provider, model);
    const estimatedCostUsd = estimateCostUsd(tokenCount, pricing);
    const credits = convertUsdToCredits(estimatedCostUsd);

    return {
        credits,
    };
}
