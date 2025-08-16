import { Page } from 'puppeteer-core';
import { CallStack } from './CallStack';

export class Call {
    packet: any;
    response: PromiseWithResolvers<unknown>;
    overwrite: { on?: any; fn?: any } = {
        on: undefined,
        fn: undefined,
    };
    prepend: { parameters: any[] } = {
        parameters: [],
    };
    append: { parameters: any[] } = {
        parameters: [],
    };

    private _resolved: boolean = false;

    private _expects?: any;
    private _on: any;
    private _stack?: CallStack;
    private _page?: Page;
    private _command: any;

    constructor(packet: any, response: PromiseWithResolvers<unknown>, on: any, stack?: CallStack) {
        this.packet = packet;
        this.response = response;
        this._stack = stack;
        this._on = on;
    }
    
    async result(result: unknown) {
        if (this.stack != null) {
            return this.stack.conclude(this, result);
        }
        
        return this.resolve(result);
    }

    async resolve(result: unknown) {
        if (this._resolved) {
            return;
        }
        this._resolved = true;

        this.response.resolve(result);
        await this.response.promise;
    }

    get parameters() {
        if (this.prepend.parameters.length === 0 && this.append.parameters.length === 0) {
            return this.packet.parameters;
        }

        return [...this.prepend.parameters, ...this.packet.parameters, ...this.append.parameters];
    }

    get fn() {
        return (this.overwrite?.fn ?? this.on[this.packet.function]).bind(this.on, ...this.parameters);
    }

    get on() {
        return this.overwrite?.on ?? this._on;
    }

    get expects() {
        return this._expects;
    }

    get stack() {
        return this._stack;
    }

    get page() {
        return this._page;
    }

    get command() {
        return this._command;
    }

    get resolved() {
        return this._resolved;
    }

    overwriteOn(on: any) {
        this.overwrite.on = on;
    }

    overwriteFn(fn: any) {
        this.overwrite.fn = fn;
    }

    prependParameters(...parameters: any[]) {
        this.prepend.parameters = parameters;
    }

    appendParameters(...parameters: any[]) {
        this.append.parameters = parameters;
    }

    setExpects(expects: any) {
        this._expects = expects;
    }

    setStack(stack: CallStack) {
        this._stack = stack;
    }

    setPage(page: Page) {
        this._page = page;
    }

    setCommand(command: any) {
        this._command = command;
    }
}
