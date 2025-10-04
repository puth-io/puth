import * as Utils from './Utils';
import { Constructors } from '@puth/core';

export const Assertion = (name, actual, expected, result, message) => {
  return {
    type: 'PuthAssertion',
    name,
    actual,
    expected,
    result,
    message,
  };
};

export class PuthAssert {
  public static async strictEqual(expected, actual, message?) {
    if (Utils.resolveConstructorName(expected) !== Utils.resolveConstructorName(actual)) {
      return Assertion(
        'strictEquals',
        Utils.resolveConstructorName(actual),
        Utils.resolveConstructorName(expected),
        false,
        'Expected objects to be the same type.',
      );
    }

    if ([Constructors.ElementHandle, Constructors.JSHandle].includes(Utils.resolveConstructorName(expected))) {
      return Assertion(
        'strictEquals',
        'Handle1',
        'Handle2',
        await Utils.handleEqual(expected, actual),
        'Expected handles to be the same.',
      );
    }

    return Assertion(
      'strictEquals',
      actual,
      expected,
      actual === expected,
      message ?? `Expected '${actual}' to be '${expected}'`,
    );
  }
}
