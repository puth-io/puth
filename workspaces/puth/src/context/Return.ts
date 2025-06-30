export class Return<T = undefined> {
    public readonly type: string;
    public readonly value: T|undefined;
    public meta: any = null;

    constructor(type: string, value?: T) {
        this.type = type;
        this.value = value;
    }

    static Undefined() {
        return Return.make('GenericUndefined');
    }

    static Null() {
        return Return.make('GenericNull');
    }

    static Self<T>() {
        return Return.make<T>('GenericSelf');
    }

    static Value<T>(value: T) {
        return Return.make('GenericValue', value);
    }

    static Array(value) {
        return Return.make('GenericArray', value);
    }

    static Values(value) {
        return Return.make('GenericValues', value);
    }

    static Objects(value) {
        return Return.make('GenericObjects', value);
    }

    static Error(value) {
        return Return.make('GenericError', value);
    }

    static ExpectationFailed(message: string, expected?: any, actual?: any) {
        return Return.make('ExpectationFailed', { message, expected, actual });
    }

    static Dialog(dialog) {
        return Return.make('Dialog', dialog);
    }

    static ServerRequest(request) {
        return Return.make('ServerRequest', {request});
    }

    withMeta(meta) {
        if (this.meta == null) {
            this.meta = meta;
            return this;
        }

        this.meta = Object.assign(this.meta, meta);
        return this;
    }

    static make<T = undefined>(type: string, value?: T) {
        return new Return(type, value);
    }

    serialize() {
        let s = {
            type: this.type,
            value: this.value,
        };
        if (this.meta !== null) {
            s.meta = this.meta;
        }

        return s;
    }
}
