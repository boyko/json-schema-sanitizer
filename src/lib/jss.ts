import {
  compose,
  partialRight
} from 'ramda';

const simpleTypes: ReadonlyArray<string> = [
  'string',
  'number',
  'integer'
];

interface RuleHandler {
  (data: any, opts: any): any
}

interface Rules {
  [name: string]: RuleHandler
}

interface Schema {
  readonly type?: string
  readonly allOf?: ReadonlyArray<object>
  readonly anyOf?: ReadonlyArray<object>
  readonly oneOf?: ReadonlyArray<object>
  readonly items?: object
  readonly default?: any
  readonly properties?: object
  readonly required?: ReadonlyArray<string>
  readonly rules?: ReadonlyArray<any>
}

interface JssOpts {
  readonly rules: Rules
}

export default class Jss {
  private readonly rules: Rules;

  constructor(opts: JssOpts) {
    this.rules = { ...opts.rules || {} };
  }

  addRule(name: string, handler: RuleHandler) {
    if (typeof this.rules[name] !== 'undefined') {
      throw new Error('A rule with the same name already exists');
    }
    this.rules[name] = handler;
  };

  compileRule(rulesConfig: ReadonlyArray<string>) {
    if (!Array.isArray(rulesConfig)) {
      throw new Error('Improperly configured. Rules should be an array of values');
    }
    const handlers = rulesConfig.map(config => {
      if (Array.isArray(config)) {
        if (config.length !== 2) {
          throw new Error('Improperly configured. If a rule is specified as an array it should have length 2.');
        }
        const ruleHandler = this.rules[config[0]];
        if (typeof ruleHandler === 'undefined') {
          throw new Error(`Cannot find rule ${config[0]}`);
        }
        const configuredHandler = partialRight(ruleHandler, [config[1]]);
        return configuredHandler;
      } else {
        const ruleHandler = this.rules[config];
        return ruleHandler;
      }
    });

    const combinedHandler = compose.apply(null, handlers.reverse());
    return combinedHandler;
  };

  applyRule(rulesConfig: ReadonlyArray<string>, data: any) {
    const handler = this.compileRule(rulesConfig);
    return handler(data);
  };

  clean(schema: Schema, data: any, required?: boolean) {
    if (simpleTypes.indexOf(schema.type) > -1) {
      const hasData = (typeof data !== 'undefined');
      if (!required && !hasData && schema.default) {
        return schema.default;
      }
      if (required && !hasData) {
        throw new Error('Invalid data');
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

      Object.keys(schema.properties).forEach(propKey => {
        const propsSchema = schema.properties[propKey];
        const nextData = data[propKey];
        const isRequired = requiredProps.indexOf(propKey) > -1;
        const cleanedPart = this.clean(propsSchema, nextData, isRequired);
        if (typeof cleanedPart !== 'undefined') {
          cleaned[propKey] = cleanedPart;
        }
      });
      return cleaned;
    } else if (schema.allOf) {
      // Collect all properties
      let cleanedParts = {};
      schema.allOf.forEach(subSchema => {
        const cleanedPart = this.clean(subSchema, data);
        cleanedParts = { ...cleanedParts, ...cleanedPart };
      });
      return cleanedParts;
    } else if (schema.anyOf) {
      return data;
    } else if (schema.oneOf) {
      return data;
    }

    if (schema.type === 'array') {
      return data.map(value => this.clean(schema.items, value));
    }

    throw new Error('Unsupported schema');
  };
}
