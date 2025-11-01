import { Question } from "./question.model";

export interface LiveSettings {
    enabled: boolean;
    sessionCode?: string;
    hostSessionCode?: string;
    lobbyEnabled?: boolean;
    interQuestionCountdownSec?: number;
}

export interface FormSection {
    id: string;
    title?: string;
    description?: string;
    items: Array<Question>;
}

export interface BranchRule {
    id: string;
    action:
    | { type: 'goto_section'; sectionId: string }
    | { type: 'goto_item'; itemId: string }
    | { type: 'end_form' };
    priority?: number;
}

export interface FormParticipant {
    id: string;
    role: 'admin' | 'viewer';
}

export interface Form {
    id: string;
    title: string;
    description?: string;

    live?: LiveSettings;
    participants?: FormParticipant[];

    sections: FormSection[];
    branchRules?: BranchRule[];
}
