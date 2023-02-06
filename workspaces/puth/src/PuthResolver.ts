class PuthResolver {
  protected resolver: {} = {};

  hasResolver(type) {
    return type in this.getResolver();
  }

  resolve(type, value) {
    return this.getResolver(type)(value);
  }

  getResolver(type?: string) {
    return type ? this.resolver[type] : this.resolver;
  }
}
