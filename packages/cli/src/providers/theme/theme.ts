export type ThemeColors = {
    primary: string;
    planMode: string;
    selection: string;
    thinking: string;
    success: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    dialogSurface: string;
    thinkingBorder: string;
    dimSeparator: string;
};

export type Theme = {
    name: string;
    colors: ThemeColors;
};

export const THEMES: Theme[] = [
    {
        name: 'Nightfox',
        colors: {
            primary: '#56D6C2',
            planMode: '#CF8EF4',
            selection: '#89B4FA',
            thinking: '#CF8EF4',
            success: '#82E0AA',
            error: '#E74C5E',
            info: '#56D6C2',
            background: '#0D0D12',
            surface: '#1A1A24',
            dialogSurface: '#0A0A10',
            thinkingBorder: '#34344A',
            dimSeparator: '#4E4E66',
        },
    },

    // Moonlight reflecting through ocean water
    {
        name: 'Moon Tide',
        colors: {
            primary: '#7FDBFF',
            planMode: '#B388FF',
            selection: '#8EC5FF',
            thinking: '#C6A0FF',
            success: '#7EE7C1',
            error: '#FF6B81',
            info: '#6FD3FF',
            background: '#060B12',
            surface: '#0F1722',
            dialogSurface: '#091018',
            thinkingBorder: '#233447',
            dimSeparator: '#35506A',
        },
    },

    // Wet midnight beach
    {
        name: 'Black Sand',
        colors: {
            primary: '#6EE7D8',
            planMode: '#A78BFA',
            selection: '#7DD3FC',
            thinking: '#C4B5FD',
            success: '#86EFAC',
            error: '#FB7185',
            info: '#67E8F9',
            background: '#0A0908',
            surface: '#161312',
            dialogSurface: '#0D0B0B',
            thinkingBorder: '#2C2524',
            dimSeparator: '#4B403D',
        },
    },

    // Sunset beach with neon reflections
    {
        name: 'Coral Drift',
        colors: {
            primary: '#FF9E7A',
            planMode: '#D8A4FF',
            selection: '#7CCBFF',
            thinking: '#E0AAFF',
            success: '#8BE9B3',
            error: '#FF5D73',
            info: '#6FE7FF',
            background: '#120D12',
            surface: '#1E1720',
            dialogSurface: '#140F16',
            thinkingBorder: '#3A2B3F',
            dimSeparator: '#5A4560',
        },
    },

    // Arctic moon / frozen ocean
    {
        name: 'Polar Current',
        colors: {
            primary: '#8BE9FD',
            planMode: '#BD93F9',
            selection: '#A4C8FF',
            thinking: '#D6BCFA',
            success: '#A7F3D0',
            error: '#FF7B9C',
            info: '#67E8F9',
            background: '#071018',
            surface: '#0E1B26',
            dialogSurface: '#08121A',
            thinkingBorder: '#243848',
            dimSeparator: '#416074',
        },
    },

    // Tropical deep ocean at night
    {
        name: 'Lagoon Noir',
        colors: {
            primary: '#3DD9C5',
            planMode: '#C084FC',
            selection: '#60A5FA',
            thinking: '#D8B4FE',
            success: '#6EE7B7',
            error: '#FB7185',
            info: '#22D3EE',
            background: '#041014',
            surface: '#0B1B22',
            dialogSurface: '#071218',
            thinkingBorder: '#183442',
            dimSeparator: '#2E5566',
        },
    },

    // Pale moon + fog + shoreline
    {
        name: 'Silver Shore',
        colors: {
            primary: '#C2F0FF',
            planMode: '#CAB8FF',
            selection: '#9CCBFF',
            thinking: '#DDD6FE',
            success: '#B9FBC0',
            error: '#FF8FA3',
            info: '#A5F3FC',
            background: '#0B0F14',
            surface: '#151B24',
            dialogSurface: '#0E131B',
            thinkingBorder: '#2A3544',
            dimSeparator: '#475569',
        },
    },

    // Bioluminescent ocean
    {
        name: 'Abyss Glow',
        colors: {
            primary: '#00F5D4',
            planMode: '#9D4EDD',
            selection: '#4CC9F0',
            thinking: '#C77DFF',
            success: '#80FFDB',
            error: '#FF4D6D',
            info: '#48CAE4',
            background: '#030712',
            surface: '#0A1120',
            dialogSurface: '#050B14',
            thinkingBorder: '#1E2A44',
            dimSeparator: '#304B6A',
        },
    },

    {
        name: 'Ember Ash',
        colors: {
            primary: '#FF9E64',
            planMode: '#C792EA',
            selection: '#82AAFF',
            thinking: '#D4A5FF',
            success: '#A6E3A1',
            error: '#FF5370',
            info: '#89DDFF',
            background: '#120C0A',
            surface: '#1D1411',
            dialogSurface: '#140D0B',
            thinkingBorder: '#3A2922',
            dimSeparator: '#5A4337',
        },
    },

    {
        name: 'Aurora Veil',
        colors: {
            primary: '#5EEAD4',
            planMode: '#A78BFA',
            selection: '#7DD3FC',
            thinking: '#C4B5FD',
            success: '#86EFAC',
            error: '#FB7185',
            info: '#67E8F9',
            background: '#071114',
            surface: '#102027',
            dialogSurface: '#0A151A',
            thinkingBorder: '#243841',
            dimSeparator: '#3E5A65',
        },
    },

    {
        name: 'Rain District',
        colors: {
            primary: '#7DCFFF',
            planMode: '#BB9AF7',
            selection: '#89B4FA',
            thinking: '#CDB4FF',
            success: '#9ECE6A',
            error: '#F7768E',
            info: '#7AA2F7',
            background: '#0A0F17',
            surface: '#151B26',
            dialogSurface: '#0E131C',
            thinkingBorder: '#2B3545',
            dimSeparator: '#4A5870',
        },
    },

    {
        name: 'Forest Signal',
        colors: {
            primary: '#4ADE80',
            planMode: '#A78BFA',
            selection: '#60A5FA',
            thinking: '#C4B5FD',
            success: '#86EFAC',
            error: '#FB7185',
            info: '#22D3EE',
            background: '#08110B',
            surface: '#122017',
            dialogSurface: '#0B1610',
            thinkingBorder: '#284032',
            dimSeparator: '#45604D',
        },
    },

    {
        name: 'Obsidian Mist',
        colors: {
            primary: '#D4D4D8',
            planMode: '#A78BFA',
            selection: '#A1A1AA',
            thinking: '#C4B5FD',
            success: '#86EFAC',
            error: '#FB7185',
            info: '#94A3B8',
            background: '#09090B',
            surface: '#141418',
            dialogSurface: '#0D0D11',
            thinkingBorder: '#2B2B35',
            dimSeparator: '#4B4B5A',
        },
    },

    {
        name: 'Desert Mirage',
        colors: {
            primary: '#F6C177',
            planMode: '#C4A7E7',
            selection: '#9CCFD8',
            thinking: '#E0B8FF',
            success: '#A6E3A1',
            error: '#EB6F92',
            info: '#89DCEB',
            background: '#14100D',
            surface: '#201A16',
            dialogSurface: '#17120F',
            thinkingBorder: '#3C3129',
            dimSeparator: '#5D4A3D',
        },
    },

    {
        name: 'Neon Harbor',
        colors: {
            primary: '#00D1FF',
            planMode: '#B388FF',
            selection: '#5DA9FF',
            thinking: '#D0A9FF',
            success: '#5CFFB2',
            error: '#FF5C7A',
            info: '#67E8F9',
            background: '#050816',
            surface: '#0D1324',
            dialogSurface: '#080D18',
            thinkingBorder: '#1F3150',
            dimSeparator: '#36557A',
        },
    },

    {
        name: 'Velvet Plum',
        colors: {
            primary: '#F0ABFC',
            planMode: '#C084FC',
            selection: '#A5B4FC',
            thinking: '#DDD6FE',
            success: '#86EFAC',
            error: '#FB7185',
            info: '#7DD3FC',
            background: '#110B14',
            surface: '#1B1320',
            dialogSurface: '#130D17',
            thinkingBorder: '#342541',
            dimSeparator: '#523B63',
        },
    },

    {
        name: 'Glacier Core',
        colors: {
            primary: '#67E8F9',
            planMode: '#A78BFA',
            selection: '#93C5FD',
            thinking: '#C4B5FD',
            success: '#99F6E4',
            error: '#FB7185',
            info: '#A5F3FC',
            background: '#061018',
            surface: '#0F1D29',
            dialogSurface: '#09131B',
            thinkingBorder: '#233B4D',
            dimSeparator: '#3F6078',
        },
    },

    {
        name: 'Retro Terminal',
        colors: {
            primary: '#33FF99',
            planMode: '#FF7AF6',
            selection: '#66B3FF',
            thinking: '#E29BFF',
            success: '#7DFFA8',
            error: '#FF5F6D',
            info: '#33D1FF',
            background: '#050706',
            surface: '#0F1412',
            dialogSurface: '#090C0B',
            thinkingBorder: '#223129',
            dimSeparator: '#3E5A4D',
        },
    },
    // Synthwave neon / cyberpunk violet
    {
        name: 'Neon Pulse',
        colors: {
            primary: '#FF4FD8',
            planMode: '#9B6DFF',
            selection: '#4DA3FF',
            thinking: '#D7A6FF',
            success: '#6DFFB3',
            error: '#FF5F7A',
            info: '#4DEBFF',
            background: '#0A0614',
            surface: '#151024',
            dialogSurface: '#0E0A18',
            thinkingBorder: '#34264D',
            dimSeparator: '#5B4A7A',
        },
    },

    // Soft futuristic pastel UI
    {
        name: 'Candy Haze',
        colors: {
            primary: '#FFB3E6',
            planMode: '#C8B6FF',
            selection: '#A0C4FF',
            thinking: '#DDD6FE',
            success: '#B9FBC0',
            error: '#FF8FA3',
            info: '#9BF6FF',
            background: '#120F17',
            surface: '#1D1824',
            dialogSurface: '#15111B',
            thinkingBorder: '#3A3046',
            dimSeparator: '#5A4C68',
        },
    },

    // Ultra vibrant magenta + electric blue
    {
        name: 'Voltage Dream',
        colors: {
            primary: '#00E5FF',
            planMode: '#C026FF',
            selection: '#4D96FF',
            thinking: '#E879FF',
            success: '#5BFF98',
            error: '#FF4D67',
            info: '#67E8F9',
            background: '#070914',
            surface: '#111827',
            dialogSurface: '#0A101C',
            thinkingBorder: '#2A3760',
            dimSeparator: '#4B5F91',
        },
    },

    // Purple velvet luxury aesthetic
    {
        name: 'Royal Static',
        colors: {
            primary: '#D946EF',
            planMode: '#A855F7',
            selection: '#818CF8',
            thinking: '#E9D5FF',
            success: '#86EFAC',
            error: '#FB7185',
            info: '#7DD3FC',
            background: '#100714',
            surface: '#1A1022',
            dialogSurface: '#120B18',
            thinkingBorder: '#39244A',
            dimSeparator: '#604179',
        },
    },

    // Pastel sunset vaporwave
    {
        name: 'Peach Mirage',
        colors: {
            primary: '#FFB86C',
            planMode: '#D6A2FF',
            selection: '#8BE9FD',
            thinking: '#F5C2FF',
            success: '#B9FBC0',
            error: '#FF7999',
            info: '#9BF6FF',
            background: '#171116',
            surface: '#241A22',
            dialogSurface: '#1A1218',
            thinkingBorder: '#453243',
            dimSeparator: '#6B5367',
        },
    },

    // Hyper saturated arcade aesthetic
    {
        name: 'Arcade Nova',
        colors: {
            primary: '#00FFA3',
            planMode: '#FF4DFF',
            selection: '#4DA8FF',
            thinking: '#D580FF',
            success: '#7CFFB2',
            error: '#FF546E',
            info: '#00E5FF',
            background: '#050816',
            surface: '#101528',
            dialogSurface: '#090D1B',
            thinkingBorder: '#25365A',
            dimSeparator: '#43658E',
        },
    },

    // Elegant lavender + moon silver
    {
        name: 'Lilac Night',
        colors: {
            primary: '#E9D5FF',
            planMode: '#C084FC',
            selection: '#A5B4FC',
            thinking: '#F3E8FF',
            success: '#BBF7D0',
            error: '#FDA4AF',
            info: '#BAE6FD',
            background: '#0F0C16',
            surface: '#191523',
            dialogSurface: '#120F1A',
            thinkingBorder: '#352B47',
            dimSeparator: '#584C6D',
        },
    },

    // Aggressive futuristic red/purple
    {
        name: 'Crimson Flux',
        colors: {
            primary: '#FF5C8A',
            planMode: '#A855F7',
            selection: '#5DA9FF',
            thinking: '#E9A8FF',
            success: '#6DFFB3',
            error: '#FF3355',
            info: '#67E8F9',
            background: '#12060C',
            surface: '#1E0F18',
            dialogSurface: '#140A11',
            thinkingBorder: '#45233A',
            dimSeparator: '#6E3C5B',
        },
    },

    // Soft dreamy pastel cyber UI
    {
        name: 'Dreamwave',
        colors: {
            primary: '#A5F3FC',
            planMode: '#C4B5FD',
            selection: '#93C5FD',
            thinking: '#F0ABFC',
            success: '#BBF7D0',
            error: '#FDA4AF',
            info: '#67E8F9',
            background: '#10131A',
            surface: '#1A1F2B',
            dialogSurface: '#131722',
            thinkingBorder: '#334155',
            dimSeparator: '#52607A',
        },
    },

    // Toxic neon hacker palette
    {
        name: 'Toxic Bloom',
        colors: {
            primary: '#39FF14',
            planMode: '#C026D3',
            selection: '#00B7FF',
            thinking: '#E879F9',
            success: '#7DFFB3',
            error: '#FF4D6D',
            info: '#22D3EE',
            background: '#060A08',
            surface: '#101712',
            dialogSurface: '#0A100C',
            thinkingBorder: '#264031',
            dimSeparator: '#456B54',
        },
    },

    // Rich sapphire + ultraviolet
    {
        name: 'Ultraviolet Sea',
        colors: {
            primary: '#38BDF8',
            planMode: '#8B5CF6',
            selection: '#60A5FA',
            thinking: '#C4B5FD',
            success: '#6EE7B7',
            error: '#FB7185',
            info: '#7DD3FC',
            background: '#070B18',
            surface: '#11172A',
            dialogSurface: '#0B1020',
            thinkingBorder: '#263B63',
            dimSeparator: '#425D8F',
        },
    },

    // High-end futuristic white neon
    {
        name: 'Ghost Circuit',
        colors: {
            primary: '#E2E8F0',
            planMode: '#C084FC',
            selection: '#93C5FD',
            thinking: '#DDD6FE',
            success: '#99F6E4',
            error: '#FB7185',
            info: '#67E8F9',
            background: '#0A0D14',
            surface: '#141925',
            dialogSurface: '#0D121C',
            thinkingBorder: '#2D3748',
            dimSeparator: '#4B5D75',
        },
    },
];

export const DEFAULT_THEME = THEMES[0]!;

/**
 *  De esta manera sera cuando sea el default theme configurable, por ahora lo dejo fijo
 *  export const DEFAULT_THEME = THEMES.find((t) => t.name ==='Nightfox')!;
 */
