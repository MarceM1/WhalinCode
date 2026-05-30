import { useLocation, useNavigate } from "react-router";
import { useTheme } from '../providers/theme';
import { useEffect } from "react";
import { SessionShell } from "../components/session-shell";
import { ErrorMessage, UserMessage, BotMessage } from "../components/messages"

export function NewSession() {
    const navigate = useNavigate();
    const location = useLocation();
    const { colors } = useTheme();

    const state = location.state as { message?: string } | null;

    useEffect(() => {
        if (!state?.message) {
            navigate('/', { replace: true });
        }
    }, [state, navigate])


    if (!state?.message) return null


    return (
        <SessionShell onSubmit={()=> {}} inputDisabled loading>
            <UserMessage message={state.message} />
            <BotMessage 
                content="This a sample bot response to demostrate the message layout."
                model="opus-4-6"
            />
            <ErrorMessage message="This a sample error message."/>
        </SessionShell>
    );
} 