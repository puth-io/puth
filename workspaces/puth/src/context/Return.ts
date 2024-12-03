export default class Return {
    private readonly type;
    private readonly value;

    constructor(type, value?) {
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
    
    // add Multiple which can contain multiple returns but the main return value must be at pos 0

    static make(type, value?) {
        return new Return(type, value);
    }

    serialize() {
        return {
            type: this.type,
            value: this.value,
        };
    }
}
