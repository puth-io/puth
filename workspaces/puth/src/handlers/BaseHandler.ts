import Puth from '@puth/puth';

export class BaseHandler {
    #puth: Puth;

    constructor(puth: Puth) {
        this.#puth = puth;
    }

    get puth() {
        return this.#puth;
    }

    get logger() {
        return this.#puth.logger;
    }
}
