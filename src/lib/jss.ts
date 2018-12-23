import { compose, partialRight } from 'ramda';

const simpleTypes: ReadonlyArray<string> = ['string', 'number', 'integer', 'boolean'];

type RuleHandler = (data: any, opts: any) => any;

type CompiledRule = (data: any) => any;

interface Rules {
  [name: string]: RuleHandler;
}

interface Schema {
  readonly type: string;
  readonly allOf?: ReadonlyArray<object>;
  readonly anyOf?: ReadonlyArray<object>;
  readonly oneOf?: ReadonlyArray<object>;
  readonly items?: object;
  readonly default?: any;
  readonly properties?: object;
  readonly patternProperties?: object;
  readonly required?: ReadonlyArray<string>;
  readonly rules?: ReadonlyArray<any>;
}

interface JssOpts {
  readonly rules?: Rules;
}

export default class Jss {
  public rules: Rules;

  public constructor(opts?: JssOpts) {
    this.rules = { ...(opts && opts.rules ? opts.rules : {}) };
  }

  public addRule(name: string, handler: RuleHandler): void {
    if (typeof this.rules[name] !== 'undefined') {
      throw new Error('A rule with the same name already exists');
    }
    this.rules[name] = handler;
  }

  public compileRule(rulesConfig: ReadonlyArray<string>): CompiledRule {
    if (!Array.isArray(rulesConfig)) {
      throw new Error(
        'Invalid rule definition.'
      );
    }
    const handlers = rulesConfig.map(config => {
      if (Array.isArray(config)) {
        if (config.length !== 2) {
          throw new Error(
            'Invalid rule definition. Rule array should have length 2.'
          );
        }
        const ruleHandler = this.rules[config[0]];
        if (typeof ruleHandler === 'undefined') {
          throw new Error(`Cannot find rule ${config[0]}.`);
        }
        return partialRight(ruleHandler, [config[1]]);
      } else {
        const ruleHandler = this.rules[config];
        if (typeof ruleHandler === 'undefined') {
          throw new Error(`Cannot find rule ${config}.`);
        }
        return ruleHandler;
      }
    });

    // @ts-ignore
    const combinedHandler = compose.apply(null, handlers.reverse());
    return combinedHandler;
  }

  public applyRule(rulesConfig: ReadonlyArray<string>, data: any): any {
    const handler = this.compileRule(rulesConfig);
    return handler(data);
  }

  public clean(schema: Schema, data: any, required?: boolean): any {
    if (simpleTypes.indexOf(schema.type) > -1) {
      const hasData = typeof data !== 'undefined';
      if (!required && !hasData && schema.default) {
        return schema.default;
      }
      if (required && !hasData) {
        throw new Error(`Invalid data`);
      }
      if (schema.rules && hasData) {
        return this.applyRule(schema.rules, data);
      }
      if (!required && !hasData) {
        return;
      }
      return data;
    }
    if (schema.properties) {
      // Clean properties
      const cleaned = {};
      const requiredProps = schema.required || [];

      // @ts-ignore
      Object.keys(schema.properties).forEach(propKey => {
        // @ts-ignore
        const propsSchema = schema.properties[propKey];
        const nextData = data[propKey];
        const isRequired = requiredProps.indexOf(propKey) > -1;
        const cleanedPart = this.clean(propsSchema, nextData, isRequired);
        if (typeof cleanedPart !== 'undefined') {
          // @ts-ignore
          cleaned[propKey] = cleanedPart;
        }
      });
      return cleaned;
    } else if (schema.patternProperties) {
      // FIXME: support pattern properties?
      return data;
    } else if (schema.allOf) {
      // Collect all properties
      let cleanedParts = {};
      schema.allOf.forEach(subSchema => {
        // @ts-ignore
        const cleanedPart = this.clean(subSchema, data);
        cleanedParts = { ...cleanedParts, ...cleanedPart };
      });
      return cleanedParts;
    } else if (schema.anyOf) {
      return data;
    } else if (schema.oneOf) {
      return data;
    } else if (schema.type === 'array') {
      // FIXME: fails on optional arrays
      // @ts-ignore
      if (isRequred && typeof data === 'undefined') {
        // FIXME: refactor error message
        throw new Error('Invalid data.');
      } else if (typeof data === 'undefined') {
        return;
      }
      // @ts-ignore
      return data.map(value => this.clean(schema.items, value));
    } else {
      throw new Error('Unsupported schema.');
    }
  }
}
