import type { Question } from './question.model';

export interface QuestionAggregates {
    questionId: string;
    totals: Array<{ choiceId: string; count: number }>;
    totalResponses: number;
    texts: string[];
}

export interface LiveSettings {
    enabled: boolean;
    sessionCode?: string;
    hostSessionCode?: string;
    lobbyEnabled?: boolean;
    interQuestionCountdownSec?: number;
    autoAdvanceAfterRevealSec?: number;
}

export interface FormSection {
    id: string;
    title?: string;
    description?: string;
    items: Question[];
}

export interface FormParticipant {
    id: string;
    role: 'admin' | 'viewer';
}

export interface BranchRule {
    id: string;
    action:
        | { type: 'goto_section'; sectionId: string }
        | { type: 'goto_item'; itemId: string }
        | { type: 'end_form' };
    priority?: number;
}

export interface Form {
    id: string;
    title: string;
    description?: string;
    live?: LiveSettings;
    participants?: FormParticipant[];
    sections?: FormSection[];
    branchRules?: BranchRule[];
}

export type LivePhase = 'asking' | 'revealing';

export interface LiveTimerState {
    remaining?: number;
    total?: number | null;
}

export interface LiveState {
    formId: string;
    sectionIndex: number;
    itemIndex: number;
    locked: boolean;
    revealResults: boolean;
    timer?: LiveTimerState | null;
    phase?: LivePhase;
}

export interface ResultsPayload {
    questionId: string;
    aggregates: any;
    interpretation?: string | null;
}

export interface ErrorMessagePayload {
    code: string;
    message: string;
}

export interface ParticipantsCountPayload {
    count: number;
}

export interface JoinFormPayload {
    formId: string;
    role: 'admin' | 'viewer';
    sessionCode?: string;
    hostSessionCode?: string;
    participantId?: string;
    displayName?: string;
}

export interface AdminActionPayload {
    formId: string;
    questionId?: string;
}

export interface SubmitAnswerPayload {
    formId: string;
    questionId: string;
    value: { choiceIds?: string[]; text?: string; number?: number };
}

export interface GetStatePayload {
    formId: string;
}

export type ClientToServerEvents = {
    join_form: (payload: JoinFormPayload) => void;
    get_state: (payload: GetStatePayload) => void;
    submit_answer: (payload: SubmitAnswerPayload) => void;
    'admin:lock': (payload: AdminActionPayload) => void;
    'admin:next': (payload: AdminActionPayload) => void;
    'admin:reveal': (payload: AdminActionPayload) => void;
    'admin:results': (payload: AdminActionPayload) => void;
    'admin:reset_form': (payload: { formId: string }) => void;
};

export type ServerToClientEvents = {
    state: (state: LiveState) => void;
    results: (payload: ResultsPayload) => void;
    'admin:dashboard': (payload: unknown) => void;
    'admin:results': (payload: ResultsPayload) => void;
    'admin:explanation': (payload: unknown) => void;
    error_msg: (payload: ErrorMessagePayload) => void;
    participants_count: (payload: ParticipantsCountPayload) => void;
};
