import { magicClassMethods } from './Utils';

export interface GenericRepresentation {
  id: string;
  type: string;
  represents: string;
}

export const MagicCustomObject = magicClassMethods(
  class AnonymousCustomObjectClass {
    private _promise;
    private options;

    constructor(resolver, options?) {
      this.options = options;

      if (typeof resolver === 'function') {
        this._promise = new Promise(resolver);
      } else if (resolver?.constructor?.name === 'Promise') {
        this._promise = resolver;
      } else {
        this._promise = Promise.resolve(resolver);
      }
    }

    catch(onRejected: (parameter) => any) {
      this._promise = this._promise.catch(onRejected);
      return this;
    }

    // Do NOT name this 'then' or it will completely break
    _then(onFulfilled: (parameter) => any, onRejected?: (parameter) => any) {
      let _p = this._promise.then(onFulfilled, onRejected);
      // ALWAYS return a new MagicCustomObject so we don't
      // alter the promise chain on then
      return new MagicCustomObject(_p.then.bind(_p));
    }

    __get(property) {
      // This has to be in the magic __get function because else
      // 'await' would return the initialized value. In here we
      // can return so 'await' thinks the function does not exist
      // on MagicCustomObject.
      if (property === 'then') {
        if (this.options?.skip) {
          return;
        }
        return (onFulfilled: (parameter) => any, onRejected?: (parameter) => any) =>
          this._then(onFulfilled, onRejected);
      }

      return (...args) => {
        return this._then((el) => {
          return el[property](...args);
        });
      };
    }

    __set(property, value) {
      return this._then((el) => {
        return (el[property] = value);
      });
    }

    __deleteProperty(property) {
      return this._then((el) => {
        return delete el[property];
      });
    }
  },
);

// tslint:disable-next-line:no-shadowed-variable max-classes-per-file
export const RemoteObject = magicClassMethods(
  // tslint:disable-next-line:no-shadowed-variable max-classes-per-file
  class AnonymousRemoteObjectClass {
    private readonly context: any;
    private readonly representation;

    constructor(context, representation) {
      this.context = context;
      this.representation = representation;
    }

    __get(property) {
      return genericGet(this, this.context, this.getRepresentation(), property);
    }

    async __set(property, value) {
      return await this.context.set(this.getRepresentation(), property, value);
    }

    async __deleteProperty(property) {
      return await this.context.delete(this.getRepresentation(), property);
    }

    getRepresentation(): GenericRepresentation {
      return this.representation;
    }
  },
);

// tslint:disable-next-line:no-shadowed-variable max-classes-per-file
export const RemoteContext = magicClassMethods(
  // tslint:disable-next-line:no-shadowed-variable max-classes-per-file
  class AnonymousRemoteContextClass {
    private readonly puth: any;
    private readonly representation;
    private options: {
      debug: boolean;
    };

    constructor(puth, representation, options?) {
      this.puth = puth;
      this.representation = representation;
      this.options = options;
    }

    call(genericObject, func, args) {
      return this.puth.contextCall({
        context: this.getRepresentation(),
        ...genericObject,
        function: func,
        parameters: args,
      });
    }

    get(genericObject, property) {
      return this.puth.contextGet({
        context: this.getRepresentation(),
        ...genericObject,
        property,
      });
    }

    set(genericObject, property, value) {
      return this.puth.contextSet({
        context: this.getRepresentation(),
        ...genericObject,
        property,
        value,
      });
    }

    delete(genericObject, property, value) {
      return this.puth.contextDelete({
        context: this.getRepresentation(),
        ...genericObject,
        property,
        value,
      });
    }

    destroy(options = null) {
      this.puth.contextDestroy({ ...this.getRepresentation(), options });
    }

    __get(property) {
      return genericGet(this, this, this.getRepresentation(), property);
    }

    debug(...args) {
      if (this.isDebug) {
        // TODO implement logger
        // tslint:disable-next-line:no-console
        console.log(...args);
      }
    }

    getRepresentation(): GenericRepresentation {
      return this.representation;
    }

    get isDebug() {
      return this.options?.debug === true;
    }
  },
);

export function genericGet(on, context, representation, property) {
  // await keeps calling then on the new returned GenericObject
  // maybe this is intentional but couldn't debug more at the moment
  // TODO validate that await behaviour is correct or if code is wrong
  if (property === 'then') {
    return;
  }

  function handleResponse(response) {
    context.debug(`${representation.type} __get =>`, property, response);

    if (response?.type === 'GenericObject') {
      return new MagicCustomObject(new RemoteObject(context, response), { skip: true });
    } else if (response?.type === 'GenericObjects') {
      return response.value.map((ro) => new MagicCustomObject(new RemoteObject(context, ro), { skip: true }));
    } else if (response?.type === 'GenericValue') {
      return response.value;
    } else if (response?.type === 'PuthAssertion') {
      return response;
    } else if (response?.type === 'error') {
      throw new Error(response.code + ': ' + response.message);
    }

    return on;
  }

  if (property === '_getProperty') {
    return async function (name) {
      return handleResponse(await context.get(representation, name));
    };
  }

  if (property === '_setProperty') {
    return async function (name, value) {
      return handleResponse(await context.set(representation, name, value));
    };
  }

  return async function (...args) {
    return await handleResponse(await context.call(representation, property, args));
  };
}
