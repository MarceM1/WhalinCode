import { useCallback, useEffect, useRef } from 'react';
import { useDialog } from '../../providers/dialog';
import { useTheme } from '../../providers/theme';
import { THEMES } from '../../providers/theme/theme';
import type { Theme } from '../../providers/theme/theme';

import { DialogSearchList } from '../dialog-search-list';

export const ThemeDialogContent = () => {
    const dialog = useDialog();
    const { setTheme, currentTheme } = useTheme();
    const originalThemeRef = useRef(currentTheme);

    const confirmedRef = useRef(false);

    //If user dismisses without confirming, restore the original theme

    useEffect(() => {
        return () => {
            if (!confirmedRef.current) {
                setTheme(originalThemeRef.current);
            };
        };
    }, [setTheme]);

    const handleSelect = useCallback((theme: Theme) => {
        confirmedRef.current = (true);
        setTheme(theme);
        dialog.close();
    }, [setTheme, dialog]);

    const handleHighlight = useCallback((theme: Theme) => {
        setTheme(theme);
    }, [setTheme]);

    return (
        <DialogSearchList
            items={THEMES}
            onSelect={handleSelect}
            onHighlight={handleHighlight}
            filterFn={(theme, query) => theme.name.toLowerCase().includes(query.toLowerCase())}
            renderItem={(theme, isSelected) => (
                <text selectable={false} fg={isSelected ? 'black' : 'white'}>
                    {theme.name === originalThemeRef.current.name
                        ? '\u0020\u2022\u0020' // . . . unicode
                        : '\u0020\u2020\u0020'
                    }
                   {theme.name} 
                </text>
            )}
            getKey={(theme) => theme.name}
            placeholder='Search themes...'
            emptyText='No matches themes'
        />
    );
};

