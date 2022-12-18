export type IExpectation = {
  test: (value: any) => boolean;
  message: string;
};

export type IExpects = {
  [key: string]: IExpectation;
};

const Expects: IExpects = {
  Element: {
    test: (el) => el !== null,
    message: 'ElementNotFound',
  },
  Array: {
    test: (el) => el.length !== 0,
    message: 'ArrayNotFound',
  },
  NotNull: {
    test: (el) => el != null,
    message: 'NullValue',
  },
};

export default Expects;
