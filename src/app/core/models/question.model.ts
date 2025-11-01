export interface QuestionMedia {
    type: 'image' | 'video' | 'audio';
    url: string;
}

export interface QuestionChoiceConstraints {
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
}

export interface QuestionChoice {
    id: string;
    input: 'choice' | 'text' | 'number';
    text: string;
    constraints?: QuestionChoiceConstraints;
    isCorrect: boolean;
}

export interface QuestionRevealExplanation {
    showExplanation: boolean;
    explanationText?: string;
    explanationAi?: boolean;
}

export type QuestionRevealStatisticsType = 'bar_chart' | 'pie_chart' | 'word_cloud' | 'none';

export interface QuestionRevealStatistics {
    showStatistics: boolean;
    statisticsType?: QuestionRevealStatisticsType;
    showPercentages?: boolean;
    minVotesToDisplay?: number;
}

export interface QuestionReveal {
    mode: 'immediate' | 'after_timer' | 'manual';
    showCorrectAnswers: boolean;
    statistics: QuestionRevealStatistics;
    explanation: QuestionRevealExplanation;
}

export interface QuestionDuration {
    type: 'timer' | 'manual';
    duration?: number;
}

export interface QuestionScore {
    enabled: boolean;
    points?: number;
    negativePoints?: number;
}

export interface Question {
    id: string;
    kind: 'multiple_choice' | 'single_choice' | 'true_false' | 'poll';
    allowMultiple: boolean;

    duration: QuestionDuration;
    question: string;
    description?: string;
    media?: QuestionMedia[];

    choices: QuestionChoice[];

    score: QuestionScore;
    reveal?: QuestionReveal;
}

export const exampleQuestion: Question = {
    id: 'q1',
    kind: 'multiple_choice',
    question: 'Quels outils utilisez-vous ?',
    choices: [
        { id: 'o1', text: 'ChatGPT', input: 'choice', isCorrect: false },
        { id: 'o2', text: 'Gemini', input: 'choice', isCorrect: true },
        { id: 'o3', text: 'Copilot', input: 'choice', isCorrect: false },
        { id: 'o4', text: 'DeepL', input: 'choice', isCorrect: false },
        { id: 'o5', text: 'Perplexity', input: 'choice', isCorrect: false },
        { id: 'o6', text: 'Claude', input: 'choice', isCorrect: false },
        { id: 'o7', text: 'Grok', input: 'choice', isCorrect: false },
        { id: 'o8', text: 'Mistral', input: 'choice', isCorrect: false },
        { id: 'o9', text: 'Autre', input: 'choice', isCorrect: false },
    ],
    allowMultiple: true,
    duration: {
        type: 'manual',
    },
    score: {
        enabled: false,
    },
};