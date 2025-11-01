import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { io, type Socket } from 'socket.io-client';

import { environment } from '../../../environments/environment';
import type {
    ClientToServerEvents,
    ErrorMessagePayload,
    Form,
    JoinFormPayload,
    LiveState,
    QuestionAggregates,
    ResultsPayload,
    ServerToClientEvents
} from '../models/live.model';
import type { Question } from '../models/question.model';

interface JoinOptions {
    sessionCode?: string;
    participantId?: string;
    displayName?: string;
}

@Injectable({ providedIn: 'root' })
export class LiveFormService implements OnDestroy {
    private readonly formSubject = new BehaviorSubject<Form | null>(null);
    private readonly stateSubject = new BehaviorSubject<LiveState | null>(null);
    private readonly questionSubject = new BehaviorSubject<Question | null>(null);
    private readonly resultsSubject = new BehaviorSubject<QuestionAggregates | null>(null);
    private readonly errorSubject = new BehaviorSubject<string | null>(null);

    private socket?: Socket<ServerToClientEvents, ClientToServerEvents>;
    private currentFormId: string | null = null;
    private lastQuestionId: string | null = null;
    private joinParams?: JoinFormPayload;
    private disconnecting = false;

    public readonly form$ = this.formSubject.asObservable();
    public readonly state$ = this.stateSubject.asObservable();
    public readonly currentQuestion$ = this.questionSubject.asObservable();
    public readonly results$ = this.resultsSubject.asObservable();
    public readonly error$ = this.errorSubject.asObservable();

    constructor(private readonly http: HttpClient) {}

    public ngOnDestroy(): void {
        this.disconnect();
    }

    public async joinForm(formId: string, options: JoinOptions = {}): Promise<Form> {
        const trimmedId = formId.trim();
        if (!trimmedId) {
            throw new Error('Veuillez renseigner un identifiant de formulaire.');
        }

        this.disconnect();
        this.errorSubject.next(null);

        try {
            const form = await firstValueFrom(
                this.http.get<Form>(this.buildApiUrl(`/forms/${encodeURIComponent(trimmedId)}`))
            );

            this.formSubject.next(form);
            this.currentFormId = trimmedId;
            this.lastQuestionId = null;
            this.resultsSubject.next(null);

            this.joinParams = {
                formId: trimmedId,
                role: 'viewer',
                sessionCode: options.sessionCode,
                participantId: options.participantId,
                displayName: options.displayName
            };

            this.initializeSocket();

            return form;
        } catch (error) {
            const message = this.extractHttpErrorMessage(error);
            this.errorSubject.next(message);
            this.resetState();
            throw error instanceof Error ? error : new Error(message);
        }
    }

    public disconnect(): void {
        this.disconnecting = true;
        if (this.socket) {
            this.removeSocketListeners();
            this.socket.disconnect();
            this.socket = undefined;
        }
        this.disconnecting = false;
        this.joinParams = undefined;
        this.currentFormId = null;
        this.resetState();
        this.formSubject.next(null);
    }

    public submitAnswer(choiceIds: string[]): void {
        const activeQuestion = this.questionSubject.value;
        const formId = this.currentFormId;

        if (!formId || !activeQuestion) {
            this.errorSubject.next('Aucune question active pour le moment.');
            return;
        }

        if (!Array.isArray(choiceIds) || choiceIds.length === 0) {
            this.errorSubject.next('Sélectionnez au moins une réponse pour participer.');
            return;
        }

        if (!this.socket || !this.socket.connected) {
            this.errorSubject.next('Connexion au serveur en cours, veuillez réessayer.');
            return;
        }

        this.socket.emit('submit_answer', {
            formId,
            questionId: activeQuestion.id,
            value: { choiceIds }
        });
    }

    public get currentQuestionSnapshot(): Question | null {
        return this.questionSubject.value;
    }

    private initializeSocket(): void {
        if (!this.joinParams) {
            return;
        }

        const auth = this.joinParams.participantId
            ? { participantId: this.joinParams.participantId }
            : undefined;

        const socket = io(environment.socketUrl, {
            autoConnect: true,
            transports: ['websocket'],
            withCredentials: true,
            auth
        });

        this.socket = socket;

        socket.on('connect', this.handleConnect);
        socket.on('state', this.handleState);
        socket.on('results', this.handleResults);
        socket.on('error_msg', this.handleErrorMessage);
        socket.on('disconnect', this.handleDisconnect);
        socket.on('connect_error', this.handleConnectError);
    }

    private removeSocketListeners(): void {
        if (!this.socket) {
            return;
        }

        this.socket.off('connect', this.handleConnect);
        this.socket.off('state', this.handleState);
        this.socket.off('results', this.handleResults);
        this.socket.off('error_msg', this.handleErrorMessage);
        this.socket.off('disconnect', this.handleDisconnect);
        this.socket.off('connect_error', this.handleConnectError);
    }

    private readonly handleConnect = () => {
        if (!this.socket || !this.joinParams) {
            return;
        }

        this.socket.emit('join_form', this.joinParams);
        this.socket.emit('get_state', { formId: this.joinParams.formId });
    };

    private readonly handleState = (state: LiveState) => {
        this.stateSubject.next(state);
        this.updateCurrentQuestion();
    };

    private readonly handleResults = (payload: ResultsPayload) => {
        if (!payload?.questionId) {
            return;
        }

        if (this.lastQuestionId && payload.questionId !== this.lastQuestionId) {
            // Store results only if they match the current question.
            return;
        }

        const aggregates = this.processAggregates(payload.questionId, payload.aggregates);
        this.resultsSubject.next(aggregates);
    };

    private readonly handleErrorMessage = (payload: ErrorMessagePayload) => {
        if (!payload) {
            return;
        }

        this.errorSubject.next(payload.message);

        if (payload.code === 'form_not_found') {
            this.disconnect();
        }
    };

    private readonly handleDisconnect = () => {
        if (this.disconnecting) {
            return;
        }

        this.stateSubject.next(null);
        this.questionSubject.next(null);
        this.resultsSubject.next(null);
    };

    private readonly handleConnectError = (error: Error) => {
        this.errorSubject.next(error.message || 'Impossible de se connecter au serveur.');
    };

    private updateCurrentQuestion(): void {
        const form = this.formSubject.value;
        const state = this.stateSubject.value;

        if (!form || !state) {
            this.lastQuestionId = null;
            this.questionSubject.next(null);
            this.resultsSubject.next(null);
            return;
        }

        const section = form.sections?.[state.sectionIndex];
        const question = section?.items?.[state.itemIndex] ?? null;
        const newQuestionId = question?.id ?? null;

        if (this.lastQuestionId !== newQuestionId) {
            this.lastQuestionId = newQuestionId;
            const currentResults = this.resultsSubject.value;
            if (!newQuestionId || (currentResults && currentResults.questionId !== newQuestionId)) {
                this.resultsSubject.next(null);
            }
        }

        this.questionSubject.next(question ?? null);
    }

    private processAggregates(questionId: string, aggregates: any): QuestionAggregates {
        const counts: Record<string, number> = {};

        const register = (choiceId: unknown, value: unknown) => {
            if (!choiceId) {
                return;
            }
            const parsedValue = Number(value);
            counts[String(choiceId)] = (counts[String(choiceId)] ?? 0) + (Number.isFinite(parsedValue) ? parsedValue : 0);
        };

        if (Array.isArray(aggregates?.choices)) {
            for (const entry of aggregates.choices) {
                register(entry?.choiceId ?? entry?.id, entry?.count ?? entry?.value ?? entry?.total);
            }
        }

        if (Array.isArray(aggregates)) {
            for (const entry of aggregates) {
                register(entry?.choiceId ?? entry?.id, entry?.count ?? entry?.value ?? entry?.total);
            }
        }

        const objectBuckets = [aggregates?.counts, aggregates?.byChoice, aggregates?.choices];
        for (const bucket of objectBuckets) {
            if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) {
                for (const [choiceId, value] of Object.entries(bucket)) {
                    register(choiceId, value);
                }
            }
        }

        const totals = Object.entries(counts).map(([choiceId, count]) => ({ choiceId, count }));
        totals.sort((a, b) => b.count - a.count);

        const computedTotal = totals.reduce((sum, entry) => sum + entry.count, 0);
        const explicitTotal = Number(aggregates?.totalResponses ?? aggregates?.total ?? aggregates?.count);

        return {
            questionId,
            totals,
            totalResponses: Number.isFinite(explicitTotal) ? explicitTotal : computedTotal
        };
    }

    private resetState(): void {
        this.stateSubject.next(null);
        this.questionSubject.next(null);
        this.resultsSubject.next(null);
        this.lastQuestionId = null;
    }

    private buildApiUrl(path: string): string {
        const base = environment.apiUrl.replace(/\/$/, '');
        return `${base}${path}`;
    }

    private extractHttpErrorMessage(error: unknown): string {
        if (error instanceof HttpErrorResponse) {
            if (error.status === 0) {
                return "Impossible d'atteindre l'API. Vérifiez qu'elle est démarrée.";
            }
            return (error.error?.message as string) || error.message || 'Erreur inconnue lors de la récupération du formulaire.';
        }

        if (error instanceof Error) {
            return error.message;
        }

        return 'Une erreur inattendue est survenue.';
    }
}
