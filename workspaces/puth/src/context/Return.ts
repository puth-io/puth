export class Return {
    private readonly type: any;
    private readonly value: any;

    constructor(type: any, value?: any) {
        this.type = type;
        this.value = value;
    }

    static Undefined() {
        return Return.make('GenericUndefined');
    }

    static Null() {
        return Return.make('GenericNull');
    }

    static Self() {
        return Return.make('GenericSelf');
    }

    static Value(value) {
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

    static make(type: any, value?: any) {
        return new Return(type, value);
    }

    serialize() {
        return {
            type: this.type,
            value: this.value,
        };
    }
}
