import { useParams } from "react-router";
import { SessionShell } from "../components/session-shell";



export function Session() {
    const { id } = useParams<{ id: string }>();
    return (
        <SessionShell onSubmit={() => { }} inputDisabled loading>
        </SessionShell>
    );
}; 