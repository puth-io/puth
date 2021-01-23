export function magicClassMethods(classDef) {
  const classHandler = Object.create(null);

  classHandler.construct = (constructTarget, constructArgs, constructReceiver) => {
    const instance = Reflect.construct(constructTarget, constructArgs, constructReceiver);
    const instanceHandler = Object.create(null);

    // __get()
    // Catches "instance.property" and "instance.property()"
    const get = Object.getOwnPropertyDescriptor(classDef.prototype, '__get');
    if (get) {
      instanceHandler.get = (target, name, receiver) => {
        if (Reflect.has(target, name)) {
          return Reflect.get(target, name, receiver);
        }

        return get.value.call(receiver, name);
      };
    }

    // __set()
    // Catches "instance.property = ..."
    const set = Object.getOwnPropertyDescriptor(classDef.prototype, '__set');
    if (set) {
      instanceHandler.set = (target, name, value, receiver) => {
        if (name in target) {
          return Reflect.set(target, name, value, receiver);
        }
        return target.__set.call(target, name, value);
      };
    }

    // __deleteProperty()
    // Catches "delete instance.property"
    const deleteProperty = Object.getOwnPropertyDescriptor(classDef.prototype, '__deleteProperty');
    if (deleteProperty) {
      instanceHandler.deleteProperty = (target, name) => {
        return deleteProperty.value.call(target, name);
      };
    }

    return new Proxy(instance, instanceHandler);
  };

  return new Proxy(classDef, classHandler);
}
